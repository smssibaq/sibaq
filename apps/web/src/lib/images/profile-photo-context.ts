import { createContext } from 'react';
/** Presentation-only override so an updated photo reaches even unsaved lineup drafts. */
export const ProfilePhotoContext=createContext<{userId:string|null;url:string|null}|null>(null);
