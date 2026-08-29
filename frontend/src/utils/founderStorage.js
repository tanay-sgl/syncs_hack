const INVITES_KEY='converge_founder_invites'
const SAVED_KEY='converge_saved_founders'
const INTENT_KEY='converge_founder_intent'
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback}catch{return fallback}}
export const getFounderInvites=()=>{try{const value=JSON.parse(localStorage.getItem(INVITES_KEY));return Array.isArray(value)?value.filter((invite)=>invite&&typeof invite.founderId==='string'&&typeof invite.message==='string'):[]}catch{return[]}}
export const saveFounderInvites=(value)=>localStorage.setItem(INVITES_KEY,JSON.stringify(value))
export const getSavedFounders=()=>{try{const value=JSON.parse(localStorage.getItem(SAVED_KEY));return Array.isArray(value)?[...new Set(value.filter((id)=>typeof id==='string'))]:[]}catch{return[]}}
export const saveSavedFounders=(value)=>localStorage.setItem(SAVED_KEY,JSON.stringify(value))
export const getFounderIntent=(fallback)=>{const value=read(INTENT_KEY,fallback);return typeof value.building==='string'&&typeof value.stage==='string'&&typeof value.lookingFor==='string'&&typeof value.domain==='string'&&typeof value.commitment==='string'&&typeof value.location==='string'&&typeof value.risk==='string'&&typeof value.style==='string'&&Array.isArray(value.neededSkills)&&value.neededSkills.every((skill)=>typeof skill==='string')?value:fallback}
export const saveFounderIntent=(value)=>localStorage.setItem(INTENT_KEY,JSON.stringify(value))
