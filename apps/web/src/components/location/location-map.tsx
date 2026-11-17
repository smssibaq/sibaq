import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GameLocation } from './location-service';
import { hasCoordinates } from './location-service';
export default function LocationMap({ value,onPin,onError }: { value: GameLocation; onPin:(lat:number,lng:number)=>void; onError:()=>void }) {
 const element=useRef<HTMLDivElement>(null), map=useRef<L.Map|null>(null),marker=useRef<L.Marker|null>(null);
 const pin=useRef(onPin); pin.current=onPin; const fail=useRef(onError);fail.current=onError;
 useEffect(()=>{
  if(!element.current)return;
  const instance=L.map(element.current,{scrollWheelZoom:false}).setView([20,0],2);map.current=instance;
  L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>fail.current()).addTo(instance);
  instance.on('click',(event:L.LeafletMouseEvent)=>{const point=event.latlng.wrap();pin.current(point.lat,point.lng);});
  const timer=setTimeout(()=>instance.invalidateSize(),50);
  return()=>{clearTimeout(timer);instance.remove();map.current=null;marker.current=null;};
 },[]);
 useEffect(()=>{
  if(!map.current)return;
  if(!hasCoordinates(value)){marker.current?.remove();marker.current=null;return;}
  const point=L.latLng(value.latitude!,value.longitude!);
  if(!marker.current){marker.current=L.marker(point,{draggable:true,keyboard:true,title:'Selected location — drag to adjust',icon:L.divIcon({className:'',html:'<span style="display:block;width:24px;height:24px;border:3px solid #F5F7F4;border-radius:50% 50% 50% 0;background:#B7F34B;transform:rotate(-45deg);box-shadow:0 3px 10px #0008"></span>',iconSize:[28,28],iconAnchor:[14,28]})}).addTo(map.current);marker.current.on('dragend',()=>{const p=marker.current!.getLatLng().wrap();pin.current(p.lat,p.lng);});}
  else marker.current.setLatLng(point);
  if(!map.current.getBounds().contains(point)||map.current.getZoom()<13)map.current.setView(point,15);
 },[value]);
 return <div ref={element} role="region" aria-label="Venue map. Click to select a location or drag the pin." className="relative z-0 h-64 w-full rounded-xl border border-border sm:h-72" />;
}
