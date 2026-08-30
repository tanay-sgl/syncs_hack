"""Reputation scoring and Human Collaboration Graph."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.models import CollaborationSignal, User

settings = get_settings()
DEFAULT_REPUTATION = settings.reputation_default


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def signal_to_score(signal: CollaborationSignal) -> float:
    """Convert one collaboration signal into a 0–5 score."""
    if signal.reliability_score is not None:
        base = float(signal.reliability_score)
    else:
        parts: list[float] = []
        if signal.showed_up is not None:
            parts.append(5.0 if signal.showed_up else 1.0)
        if signal.completed_goal is not None:
            parts.append(5.0 if signal.completed_goal else 1.5)
        if signal.would_collaborate_again is not None:
            parts.append(5.0 if signal.would_collaborate_again else 1.0)
        base = sum(parts) / len(parts) if parts else DEFAULT_REPUTATION

    if signal.showed_up is True:
        base = min(5.0, base + 0.15)
    elif signal.showed_up is False:
        base = max(0.0, base - 0.5)

    if signal.would_collaborate_again is True:
        base = min(5.0, base + 0.15)
    elif signal.would_collaborate_again is False:
        base = max(0.0, base - 0.35)

    return round(max(0.0, min(5.0, base)), 2)


def recency_weight(created_at: datetime | None, now: datetime | None = None) -> float:
    """
    Exponential decay weight so newer signals count more.
    Half-life: after reputation_half_life_days, weight ≈ 0.5.
    """
    now = now or datetime.now(UTC)
    created = _aware(created_at) or now
    age_days = max(0.0, (now - created).total_seconds() / 86400.0)
    half_life = max(1.0, settings.reputation_half_life_days)
    return math.pow(0.5, age_days / half_life)


def weighted_average(scores: list[float], weights: list[float]) -> float:
    if not scores or not weights or sum(weights) <= 0:
        return DEFAULT_REPUTATION
    return sum(s * w for s, w in zip(scores, weights)) / sum(weights)


def apply_idle_decay(
    score: float,
    last_signal_at: datetime | None,
    now: datetime | None = None,
) -> float:
    """
    If no new signals for a long time, gently pull score toward the default (3.0).
    Prevents ancient praise (or blame) from freezing a reputation forever.
    """
    now = now or datetime.now(UTC)
    last = _aware(last_signal_at)
    if last is None:
        return score

    idle_days = max(0.0, (now - last).total_seconds() / 86400.0)
    threshold = settings.reputation_idle_decay_days
    if idle_days <= threshold:
        return score

    # Excess idle beyond threshold → blend toward default
    excess = idle_days - threshold
    # After another full threshold of idle, blend factor approaches strength
    blend = min(
        settings.reputation_idle_decay_strength,
        settings.reputation_idle_decay_strength * (excess / threshold),
    )
    decayed = score * (1 - blend) + DEFAULT_REPUTATION * blend
    return round(max(0.0, min(5.0, decayed)), 2)


def compute_reputation_from_signals(
    signals: list[CollaborationSignal],
    now: datetime | None = None,
) -> dict[str, Any]:
    """Full reputation computation: weighted recency + idle decay + trust."""
    now = now or datetime.now(UTC)
    count = len(signals)
    trusted = count >= settings.reputation_min_signals_for_trust

    if count == 0:
        return {
            "reputation_score": DEFAULT_REPUTATION,
            "reputation_signal_count": 0,
            "reputation_trusted": False,
            "raw_weighted_score": DEFAULT_REPUTATION,
            "last_signal_at": None,
            "effective_weights": [],
        }

    scores = [signal_to_score(s) for s in signals]
    weights = [recency_weight(s.created_at, now) for s in signals]
    raw = weighted_average(scores, weights)

    last_signal_at = max((_aware(s.created_at) or now) for s in signals)
    final = apply_idle_decay(raw, last_signal_at, now)

    # Until trusted, blend toward default so early noise can't dominate
    if not trusted:
        trust_ratio = count / settings.reputation_min_signals_for_trust
        final = round(DEFAULT_REPUTATION * (1 - trust_ratio) + final * trust_ratio, 2)

    return {
        "reputation_score": round(max(0.0, min(5.0, final)), 2),
        "reputation_signal_count": count,
        "reputation_trusted": trusted,
        "raw_weighted_score": round(raw, 2),
        "last_signal_at": last_signal_at,
        "effective_weights": [round(w, 4) for w in weights],
    }


def recalculate_reputation(db: Session, user_id: int) -> float:
    """Recompute and persist reputation from all signals about this user."""
    signals = (
        db.query(CollaborationSignal)
        .filter(CollaborationSignal.rated_id == user_id)
        .order_by(CollaborationSignal.created_at.desc())
        .all()
    )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return DEFAULT_REPUTATION

    result = compute_reputation_from_signals(signals)
    user.reputation_score = result["reputation_score"]
    user.reputation_signal_count = result["reputation_signal_count"]
    user.reputation_trusted = result["reputation_trusted"]
    user.reputation_updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return user.reputation_score


def get_reputation_summary(db: Session, user_id: int) -> dict[str, Any]:
    """Detailed reputation breakdown for API responses."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {
            "user_id": user_id,
            "reputation_score": DEFAULT_REPUTATION,
            "reputation_signal_count": 0,
            "reputation_trusted": False,
            "min_signals_for_trust": settings.reputation_min_signals_for_trust,
            "signals_until_trusted": settings.reputation_min_signals_for_trust,
            "last_signal_at": None,
            "raw_weighted_score": DEFAULT_REPUTATION,
            "half_life_days": settings.reputation_half_life_days,
            "idle_decay_days": settings.reputation_idle_decay_days,
        }

    signals = (
        db.query(CollaborationSignal)
        .filter(CollaborationSignal.rated_id == user_id)
        .order_by(CollaborationSignal.created_at.desc())
        .all()
    )
    result = compute_reputation_from_signals(signals)
    return {
        "user_id": user_id,
        "reputation_score": result["reputation_score"],
        "reputation_signal_count": result["reputation_signal_count"],
        "reputation_trusted": result["reputation_trusted"],
        "min_signals_for_trust": settings.reputation_min_signals_for_trust,
        "signals_until_trusted": max(
            0, settings.reputation_min_signals_for_trust - result["reputation_signal_count"]
        ),
        "last_signal_at": result["last_signal_at"],
        "raw_weighted_score": result["raw_weighted_score"],
        "half_life_days": settings.reputation_half_life_days,
        "idle_decay_days": settings.reputation_idle_decay_days,
    }


def build_collaboration_edge(
    from_user_id: int,
    to_user_id: int,
    outbound: list[CollaborationSignal],
    inbound: list[CollaborationSignal],
) -> dict[str, Any] | None:
    """Summarize directed collaboration quality between two users."""
    if not outbound and not inbound:
        return None

    now = datetime.now(UTC)
    out_scores = [signal_to_score(s) for s in outbound]
    in_scores = [signal_to_score(s) for s in inbound]
    out_weights = [recency_weight(s.created_at, now) for s in outbound]
    in_weights = [recency_weight(s.created_at, now) for s in inbound]

    outbound_score = weighted_average(out_scores, out_weights) if out_scores else None
    inbound_score = weighted_average(in_scores, in_weights) if in_scores else None

    if outbound_score is not None and inbound_score is not None:
        compatibility = round((outbound_score + inbound_score) / 2, 2)
        mutual = True
    elif outbound_score is not None:
        compatibility = round(outbound_score, 2)
        mutual = False
    else:
        compatibility = round(inbound_score or DEFAULT_REPUTATION, 2)
        mutual = False

    would_again_out = [s.would_collaborate_again for s in outbound if s.would_collaborate_again is not None]
    would_again_in = [s.would_collaborate_again for s in inbound if s.would_collaborate_again is not None]
    would_again = would_again_out + would_again_in
    would_collaborate_again_rate = (
        round(sum(1 for v in would_again if v) / len(would_again), 2) if would_again else None
    )

    shared_groups = {s.group_id for s in outbound + inbound}

    return {
        "user_id": to_user_id if from_user_id != to_user_id else from_user_id,
        "compatibility_score": compatibility,
        "mutual": mutual,
        "outbound_score": round(outbound_score, 2) if outbound_score is not None else None,
        "inbound_score": round(inbound_score, 2) if inbound_score is not None else None,
        "signal_count": len(outbound) + len(inbound),
        "shared_group_count": len(shared_groups),
        "would_collaborate_again_rate": would_collaborate_again_rate,
        "works_well_together": compatibility >= 3.75 and (would_collaborate_again_rate is None or would_collaborate_again_rate >= 0.5),
    }


def get_collaboration_partners(
    db: Session,
    user_id: int,
    *,
    min_compatibility: float = 0.0,
    works_well_only: bool = False,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Human Collaboration Graph neighborhood for a user.
    Edges come from real collaboration signals (both directions).
    """
    signals = (
        db.query(CollaborationSignal)
        .filter(
            (CollaborationSignal.rater_id == user_id) | (CollaborationSignal.rated_id == user_id)
        )
        .all()
    )
    if not signals:
        return []

    outbound: dict[int, list[CollaborationSignal]] = defaultdict(list)
    inbound: dict[int, list[CollaborationSignal]] = defaultdict(list)
    partner_ids: set[int] = set()

    for signal in signals:
        if signal.rater_id == user_id and signal.rated_id != user_id:
            outbound[signal.rated_id].append(signal)
            partner_ids.add(signal.rated_id)
        elif signal.rated_id == user_id and signal.rater_id != user_id:
            inbound[signal.rater_id].append(signal)
            partner_ids.add(signal.rater_id)

    users = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(partner_ids), User.is_active.is_(True)).all()
    }

    partners: list[dict[str, Any]] = []
    for partner_id in partner_ids:
        partner = users.get(partner_id)
        if not partner:
            continue
        edge = build_collaboration_edge(
            user_id,
            partner_id,
            outbound.get(partner_id, []),
            inbound.get(partner_id, []),
        )
        if not edge:
            continue
        if edge["compatibility_score"] < min_compatibility:
            continue
        if works_well_only and not edge["works_well_together"]:
            continue
        partners.append(
            {
                **edge,
                "username": partner.username,
                "name": partner.name,
                "university": partner.university,
                "reputation_score": partner.reputation_score,
                "reputation_trusted": partner.reputation_trusted,
            }
        )

    partners.sort(key=lambda p: (p["works_well_together"], p["compatibility_score"], p["mutual"]), reverse=True)
    return partners[:limit]


def pair_compatibility(db: Session, user_a: int, user_b: int) -> dict[str, Any] | None:
    """Compatibility between two specific users from the collaboration graph."""
    if user_a == user_b:
        return None
    outbound = (
        db.query(CollaborationSignal)
        .filter(CollaborationSignal.rater_id == user_a, CollaborationSignal.rated_id == user_b)
        .all()
    )
    inbound = (
        db.query(CollaborationSignal)
        .filter(CollaborationSignal.rater_id == user_b, CollaborationSignal.rated_id == user_a)
        .all()
    )
    edge = build_collaboration_edge(user_a, user_b, outbound, inbound)
    if not edge:
        return None
    other = db.query(User).filter(User.id == user_b).first()
    if not other:
        return None
    return {
        **edge,
        "username": other.username,
        "name": other.name,
        "university": other.university,
        "reputation_score": other.reputation_score,
        "reputation_trusted": other.reputation_trusted,
    }
