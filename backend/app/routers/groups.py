from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models.models import CollaborationSignal, Group, GroupMember, MemberStatus, User
from app.schemas.schemas import (
    CollaborationSignalCreate,
    CollaborationSignalResponse,
    GroupCreate,
    GroupMemberCreate,
    GroupMemberUpdate,
    GroupResponse,
    GroupUpdate,
)
from app.services.intent_service import create_group, serialize_group, update_group
from app.websocket.manager import manager

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group_endpoint(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = create_group(db, current_user, data)
    group = (
        db.query(Group)
        .options(
            joinedload(Group.members).joinedload(GroupMember.user),
            joinedload(Group.collaboration_space),
        )
        .filter(Group.id == group.id)
        .first()
    )
    payload = serialize_group(group)  # type: ignore[arg-type]
    for member in group.members:  # type: ignore[union-attr]
        await manager.send_to_user(member.user_id, {"type": "group_invite", "data": payload})
    await manager.broadcast({"type": "group_created", "data": payload})
    return payload


@router.get("/mine", response_model=list[GroupResponse])
def my_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    groups = (
        db.query(Group)
        .join(GroupMember)
        .options(
            joinedload(Group.members).joinedload(GroupMember.user),
            joinedload(Group.collaboration_space),
        )
        .filter(GroupMember.user_id == current_user.id)
        .order_by(Group.created_at.desc())
        .all()
    )
    return [serialize_group(group) for group in groups]


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = (
        db.query(Group)
        .options(
            joinedload(Group.members).joinedload(GroupMember.user),
            joinedload(Group.collaboration_space),
        )
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return serialize_group(group)


@router.patch("/{group_id}", response_model=GroupResponse)
async def patch_group(
    group_id: int,
    data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = _get_group_or_404(db, group_id)
    _ensure_group_member(group, current_user.id)

    group = update_group(db, group, data)
    group = (
        db.query(Group)
        .options(
            joinedload(Group.members).joinedload(GroupMember.user),
            joinedload(Group.collaboration_space),
        )
        .filter(Group.id == group.id)
        .first()
    )
    payload = serialize_group(group)  # type: ignore[arg-type]
    await manager.broadcast({"type": "group_updated", "data": payload})
    return payload


@router.post("/{group_id}/members", response_model=GroupResponse)
async def add_member(
    group_id: int,
    data: GroupMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = _get_group_or_404(db, group_id)
    _ensure_group_member(group, current_user.id)

    existing = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == data.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in group")

    member = GroupMember(group_id=group_id, user_id=data.user_id, role=data.role, status=MemberStatus.INVITED)
    db.add(member)
    db.commit()

    group = _load_group(db, group_id)
    payload = serialize_group(group)
    await manager.send_to_user(data.user_id, {"type": "group_invite", "data": payload})
    return payload


@router.patch("/{group_id}/members/{user_id}", response_model=GroupResponse)
async def update_member(
    group_id: int,
    user_id: int,
    data: GroupMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = _get_group_or_404(db, group_id)
    member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if user_id != current_user.id:
        _ensure_group_member(group, current_user.id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(member, key, value)
    db.commit()

    group = _load_group(db, group_id)
    payload = serialize_group(group)
    await manager.broadcast({"type": "group_member_updated", "data": payload})
    return payload


@router.post("/{group_id}/signals", response_model=CollaborationSignalResponse, status_code=status.HTTP_201_CREATED)
def submit_signal(
    group_id: int,
    data: CollaborationSignalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = _get_group_or_404(db, group_id)
    _ensure_group_member(group, current_user.id)

    signal = CollaborationSignal(
        group_id=group_id,
        rater_id=current_user.id,
        rated_id=data.rated_id,
        showed_up=data.showed_up,
        completed_goal=data.completed_goal,
        would_collaborate_again=data.would_collaborate_again,
        reliability_score=data.reliability_score,
        comment=data.comment,
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)
    return signal


def _get_group_or_404(db: Session, group_id: int) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


def _load_group(db: Session, group_id: int) -> Group:
    return (
        db.query(Group)
        .options(
            joinedload(Group.members).joinedload(GroupMember.user),
            joinedload(Group.collaboration_space),
        )
        .filter(Group.id == group_id)
        .first()
    )


def _ensure_group_member(group: Group, user_id: int) -> None:
    if not any(m.user_id == user_id for m in group.members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")
