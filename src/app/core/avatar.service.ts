import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, SafeUrl>();

  getAvatar(seed: string, initials: string, size = 160): SafeUrl {
    const key = `${seed}|${initials}|${size}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const svg = this.buildAvatarSvg(seed, initials, size);
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const safe = this.sanitizer.bypassSecurityTrustUrl(dataUrl);
    this.cache.set(key, safe);
    return safe;
  }

  private buildAvatarSvg(seed: string, initials: string, size: number): string {
    const rand = this.seeded(seed);
    const bgPalette = ['#1f1f1f', '#242a1c', '#2b2f1e', '#243035', '#2a2636', '#2f1f27', '#1f2b2f', '#2b1f1a'];
    const skinTones = ['#f7c08a', '#efb07a', '#e1a371', '#d09063', '#c07f53', '#f4c4b0', '#e4a98a', '#f1b995'];
    const accentPalette = ['#c9da7a', '#bff06a', '#6be0d4', '#ff8fa3', '#ffb36b', '#d3a8ff', '#7fb1ff'];

    const bg1 = bgPalette[Math.floor(rand() * bgPalette.length)];
    const bg2 = bgPalette[Math.floor(rand() * bgPalette.length)];
    const accent = accentPalette[Math.floor(rand() * accentPalette.length)];
    const skin = skinTones[Math.floor(rand() * skinTones.length)];
    const eye = '#1b1b1b';
    const blush = 'rgba(245,141,165,0.3)';

    const r = Math.floor(size / 2);
    const headR = Math.floor(size * (0.22 + rand() * 0.03));
    const headCx = r;
    const headCy = Math.floor(size * (0.58 + rand() * 0.02));
    const eyeY = Math.floor(headCy - headR * 0.15);
    const eyeX = Math.floor(headR * 0.45);
    const eyeR = Math.max(2, Math.floor(headR * 0.12));
    const mouthY = Math.floor(headCy + headR * 0.25);
    const mouthW = Math.floor(headR * 0.75);
    const mouthH = Math.floor(headR * 0.25);
    const dotX = Math.floor(size * (0.2 + rand() * 0.6));
    const dotY = Math.floor(size * (0.2 + rand() * 0.5));
    const dotR = Math.floor(size * (0.06 + rand() * 0.05));
    const eyeStyle = Math.floor(rand() * 2);
    const mouthStyle = Math.floor(rand() * 3);
    const accessory = Math.floor(rand() * 4);

    let eyesMarkup = '';
    if (eyeStyle === 0) {
      eyesMarkup = `
        <circle cx="${headCx - eyeX}" cy="${eyeY}" r="${eyeR}" fill="${eye}" />
        <circle cx="${headCx + eyeX}" cy="${eyeY}" r="${eyeR}" fill="${eye}" />`;
    } else {
      const arcW = Math.floor(eyeR * 2.4);
      const arcH = Math.floor(eyeR * 1.2);
      eyesMarkup = `
        <path d="M${headCx - eyeX - arcW * 0.5} ${eyeY}
          Q ${headCx - eyeX} ${eyeY - arcH} ${headCx - eyeX + arcW * 0.5} ${eyeY}"
          stroke="${eye}" stroke-width="${Math.max(2, Math.floor(eyeR * 0.6))}" stroke-linecap="round" fill="none" />
        <path d="M${headCx + eyeX - arcW * 0.5} ${eyeY}
          Q ${headCx + eyeX} ${eyeY - arcH} ${headCx + eyeX + arcW * 0.5} ${eyeY}"
          stroke="${eye}" stroke-width="${Math.max(2, Math.floor(eyeR * 0.6))}" stroke-linecap="round" fill="none" />`;
    }

    let mouthMarkup = '';
    if (mouthStyle === 0) {
      mouthMarkup = `
        <path d="M${headCx - mouthW * 0.5} ${mouthY}
          Q ${headCx} ${mouthY + mouthH * 0.6} ${headCx + mouthW * 0.5} ${mouthY}"
          stroke="${eye}" stroke-width="${Math.max(2, Math.floor(headR * 0.08))}" stroke-linecap="round" fill="none" />`;
    } else if (mouthStyle === 1) {
      mouthMarkup = `
        <line x1="${headCx - mouthW * 0.45}" y1="${mouthY}" x2="${headCx + mouthW * 0.45}" y2="${mouthY}"
          stroke="${eye}" stroke-width="${Math.max(2, Math.floor(headR * 0.08))}" stroke-linecap="round" />`;
    } else {
      mouthMarkup = `
        <path d="M${headCx - mouthW * 0.45} ${mouthY}
          Q ${headCx} ${mouthY + mouthH * 0.5} ${headCx + mouthW * 0.45} ${mouthY}"
          stroke="${eye}" stroke-width="${Math.max(2, Math.floor(headR * 0.08))}" stroke-linecap="round" fill="none" />
        <circle cx="${headCx}" cy="${mouthY + mouthH * 0.2}" r="${Math.max(2, Math.floor(headR * 0.08))}" fill="${eye}" opacity="0.25" />`;
    }

    let accessoryMarkup = '';
    if (accessory === 1) {
      const gW = Math.floor(headR * 0.9);
      const gH = Math.floor(headR * 0.55);
      const gY = eyeY - Math.floor(headR * 0.1);
      accessoryMarkup = `
        <rect x="${headCx - gW - 2}" y="${gY}" width="${gW}" height="${gH}" rx="${Math.floor(gH * 0.35)}"
          stroke="${accent}" stroke-width="2" fill="none" />
        <rect x="${headCx + 2}" y="${gY}" width="${gW}" height="${gH}" rx="${Math.floor(gH * 0.35)}"
          stroke="${accent}" stroke-width="2" fill="none" />
        <line x1="${headCx - 2}" y1="${gY + gH * 0.55}" x2="${headCx + 2}" y2="${gY + gH * 0.55}"
          stroke="${accent}" stroke-width="2" stroke-linecap="round" />`;
    } else if (accessory === 2) {
      const hatW = Math.floor(headR * 1.8);
      const hatH = Math.floor(headR * 0.6);
      const hatY = headCy - headR * 1.1;
      accessoryMarkup = `
        <rect x="${headCx - hatW * 0.5}" y="${hatY}" width="${hatW}" height="${hatH}"
          rx="${Math.floor(hatH * 0.5)}" fill="${accent}" />
        <rect x="${headCx - hatW * 0.7}" y="${hatY + hatH * 0.7}" width="${hatW * 1.4}" height="${Math.floor(hatH * 0.3)}"
          rx="${Math.floor(hatH * 0.2)}" fill="${accent}" />`;
    } else if (accessory === 3) {
      accessoryMarkup = `
        <circle cx="${headCx - eyeX * 0.8}" cy="${eyeY + eyeR * 2.2}" r="${eyeR * 0.7}" fill="${blush}" />
        <circle cx="${headCx + eyeX * 0.8}" cy="${eyeY + eyeR * 2.2}" r="${eyeR * 0.7}" fill="${blush}" />`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="ptg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bg1}" />
            <stop offset="55%" stop-color="${bg2}" />
            <stop offset="100%" stop-color="${accent}" />
          </linearGradient>
          <clipPath id="ptc">
            <circle cx="${r}" cy="${r}" r="${r - 2}" />
          </clipPath>
        </defs>
        <g clip-path="url(#ptc)">
          <circle cx="${r}" cy="${r}" r="${r}" fill="url(#ptg)" />
          <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="rgba(0,0,0,0.12)" />
          <circle cx="${headCx}" cy="${headCy}" r="${headR}" fill="${skin}" />
          ${eyesMarkup}
          ${mouthMarkup}
          ${accessoryMarkup}
        </g>
        <circle cx="${r}" cy="${r}" r="${r - 2}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2" />
      </svg>
    `;
  }

  private seeded(seed: string): () => number {
    let t = 0;
    for (let i = 0; i < seed.length; i += 1) {
      t = (t << 5) - t + seed.charCodeAt(i);
      t |= 0;
    }
    let state = t >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
}
