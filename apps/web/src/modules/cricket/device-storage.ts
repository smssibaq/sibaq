/** Local-only cricket notes. No server writes or invented RPCs. */
export function readCricketDeviceValue<T>(key:string,valid:(value:unknown)=>value is T):T|null{
  try{const raw=localStorage.getItem(key);if(!raw)return null;const value:unknown=JSON.parse(raw);return valid(value)?value:null;}catch{return null;}
}
export function saveCricketDeviceValue(key:string,value:unknown):boolean{
  try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
}
