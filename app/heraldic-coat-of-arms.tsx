"use client";

import { useEffect, useState } from "react";

interface HeraldicCelebrationModalProps {
  show: boolean;
  onClose: () => void;
  leagueTitle?: string;
  inviteCode?: string;
}

export function HeraldicCelebrationModal({
  show,
  onClose,
  leagueTitle,
  inviteCode,
}: HeraldicCelebrationModalProps) {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!show) return;

    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        return;
      }
    }

    const timerFade = setTimeout(() => {
      setIsFading(true);
    }, 2800);

    const timerClose = setTimeout(() => {
      setIsFading(false);
      onClose();
    }, 3300);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerClose);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Закрити святкову заставку"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClose();
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e]/95 backdrop-blur-md px-4 text-center cursor-pointer select-none transition-all duration-500 ${
        isFading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <style>{`
        @keyframes drawHeraldicStroke {
          0% {
            stroke-dashoffset: 1800;
            opacity: 0.1;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes fillFadeIn {
          0% {
            fill-opacity: 0;
          }
          60% {
            fill-opacity: 0.2;
          }
          100% {
            fill-opacity: 1;
          }
        }
        @keyframes goldenPulse {
          0%, 100% {
            filter: drop-shadow(0 0 15px rgba(234, 179, 8, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 35px rgba(245, 158, 11, 0.85));
          }
        }
        .heraldic-line {
          stroke-dasharray: 1800;
          stroke-dashoffset: 1800;
          animation: drawHeraldicStroke 1.8s cubic-bezier(0.35, 0, 0.25, 1) forwards;
        }
        .heraldic-fill {
          animation: fillFadeIn 2.1s ease-out forwards;
        }
        .heraldic-glow {
          animation: goldenPulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* Головний гербовий комплекс: Два леви, Корона, Щит із Юрієм Змієборцем, Бароковий постамент і Стрічка */}
      <div className="relative mb-5 max-w-lg heraldic-glow">
        <svg
          viewBox="0 0 540 440"
          className="h-56 w-72 sm:h-72 sm:w-96 drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Королівське золото */}
            <linearGradient id="royalGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Золоте сяйво шерсті левів */}
            <linearGradient id="lionGold" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>

            {/* Рубіновий гербовий щит */}
            <linearGradient id="shieldRuby" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>

            {/* Срібний кінь */}
            <linearGradient id="horseSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* 1. КОРОНА НАД ЩИТОМ (The Royal Crown) */}
          {/* ========================================================= */}
          <g className="heraldic-fill" fill="url(#royalGold)">
            {/* Хрест угорі */}
            <path
              d="M 270 20 L 270 42 M 262 28 L 278 28"
              stroke="url(#royalGold)"
              strokeWidth="4"
              strokeLinecap="round"
              className="heraldic-line"
            />
            {/* Яблуко під хрестом */}
            <circle cx="270" cy="46" r="6" fill="#fef08a" stroke="#b45309" strokeWidth="1.5" />
            {/* Дуги корони */}
            <path
              d="M 270 52 
                 C 255 55 235 68 230 95
                 M 270 52 
                 C 285 55 305 68 310 95
                 M 270 52 L 270 95
                 M 270 52 
                 C 240 60 215 78 205 100
                 M 270 52 
                 C 300 60 325 78 335 100"
              stroke="url(#royalGold)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              className="heraldic-line"
            />
            {/* Перлини на дугах */}
            <circle cx="248" cy="65" r="2.5" fill="#ffffff" />
            <circle cx="292" cy="65" r="2.5" fill="#ffffff" />
            <circle cx="236" cy="80" r="2.5" fill="#ffffff" />
            <circle cx="304" cy="80" r="2.5" fill="#ffffff" />
            {/* Оксамитова шапка під дугами */}
            <path
              d="M 205 100 C 205 65 335 65 335 100 Z"
              fill="#7f1d1d"
              opacity="0.8"
            />
            {/* Обід (діадема) корони з коштовним камінням */}
            <path
              d="M 198 96 L 342 96 L 336 112 L 204 112 Z"
              fill="url(#royalGold)"
              stroke="#78350f"
              strokeWidth="2"
            />
            <circle cx="220" cy="104" r="3" fill="#dc2626" />
            <circle cx="245" cy="104" r="3" fill="#0284c7" />
            <circle cx="270" cy="104" r="3.5" fill="#16a34a" />
            <circle cx="295" cy="104" r="3" fill="#0284c7" />
            <circle cx="320" cy="104" r="3" fill="#dc2626" />
          </g>

          {/* ========================================================= */}
          {/* 2. ЛІВИЙ ЗДИБЛЕНИЙ ЛЕВ (Left Rampant Lion) */}
          {/* ========================================================= */}
          <g>
            {/* Тіло лева */}
            <path
              d="M 185 140
                 C 170 120 150 115 130 115
                 C 115 115 95 125 90 145
                 C 85 160 92 175 105 185
                 C 100 195 95 210 98 230
                 C 102 255 115 280 125 305
                 C 130 318 135 335 128 350
                 C 120 365 100 370 85 372
                 L 115 378
                 C 135 375 145 360 148 340
                 C 152 315 142 295 138 275
                 C 150 260 165 240 175 220
                 L 190 220
                 L 182 235
                 L 198 235
                 C 192 250 180 260 175 275
                 L 188 280
                 C 195 260 200 240 195 215
                 L 195 180
                 L 180 180
                 C 185 165 188 150 185 140 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="heraldic-fill"
            />
            {/* Грива та голова лівого лева */}
            <path
              d="M 130 115
                 C 120 100 105 92 90 95
                 C 80 97 72 108 70 120
                 C 68 128 75 138 85 140
                 C 78 145 74 155 76 165
                 C 80 180 95 190 110 195
                 C 125 200 140 192 145 178
                 C 150 165 142 150 135 142
                 C 142 135 140 122 130 115 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2"
            />
            {/* Морда, відкрита паща з язиком */}
            <path
              d="M 78 108 L 62 105 C 58 112 62 120 70 122 L 60 128 L 74 132"
              stroke="#713f12"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              className="heraldic-line"
            />
            <path d="M 64 115 Q 52 118 56 126" stroke="#dc2626" strokeWidth="2.5" fill="none" />
            <circle cx="78" cy="106" r="2.5" fill="#000" />

            {/* Хвіст лівого лева (пишний s-подібний з китицею) */}
            <path
              d="M 125 305
                 C 95 315 70 290 60 260
                 C 50 225 65 180 50 150
                 C 42 135 30 130 22 140
                 C 15 150 20 170 32 185
                 C 25 182 18 190 20 200
                 C 25 215 45 220 52 235"
              stroke="url(#lionGold)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              className="heraldic-line"
            />
            {/* Китиця хвоста */}
            <path
              d="M 22 140 C 15 125 28 112 38 120 C 45 125 35 138 22 140 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="1.5"
            />

            {/* Передні лапи, що спираються на щит */}
            <path
              d="M 175 165 L 202 160 L 205 168 L 180 175 Z
                 M 180 195 L 204 192 L 206 200 L 178 205 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2"
            />
            {/* Кігті */}
            <path d="M 205 158 L 210 160 M 207 167 L 212 168 M 206 190 L 211 192 M 208 199 L 213 200" stroke="#fff" strokeWidth="2" />
          </g>

          {/* ========================================================= */}
          {/* 3. ПРАВИЙ ЗДИБЛЕНИЙ ЛЕВ (Right Rampant Lion) */}
          {/* ========================================================= */}
          <g>
            {/* Тіло правого лева */}
            <path
              d="M 355 140
                 C 370 120 390 115 410 115
                 C 425 115 445 125 450 145
                 C 455 160 448 175 435 185
                 C 440 195 445 210 442 230
                 C 438 255 425 280 415 305
                 C 410 318 405 335 412 350
                 C 420 365 440 370 455 372
                 L 425 378
                 C 405 375 395 360 392 340
                 C 388 315 398 295 402 275
                 C 390 260 375 240 365 220
                 L 350 220
                 L 358 235
                 L 342 235
                 C 348 250 360 260 365 275
                 L 352 280
                 C 345 260 340 240 345 215
                 L 345 180
                 L 360 180
                 C 355 165 352 150 355 140 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="heraldic-fill"
            />
            {/* Грива та голова правого лева */}
            <path
              d="M 410 115
                 C 420 100 435 92 450 95
                 C 460 97 468 108 470 120
                 C 472 128 465 138 455 140
                 C 462 145 466 155 464 165
                 C 460 180 445 190 430 195
                 C 415 200 400 192 395 178
                 C 390 165 398 150 405 142
                 C 398 135 400 122 410 115 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2"
            />
            {/* Морда, відкрита паща з язиком */}
            <path
              d="M 462 108 L 478 105 C 482 112 478 120 470 122 L 480 128 L 466 132"
              stroke="#713f12"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              className="heraldic-line"
            />
            <path d="M 476 115 Q 488 118 484 126" stroke="#dc2626" strokeWidth="2.5" fill="none" />
            <circle cx="462" cy="106" r="2.5" fill="#000" />

            {/* Хвіст правого лева */}
            <path
              d="M 415 305
                 C 445 315 470 290 480 260
                 C 490 225 475 180 490 150
                 C 498 135 510 130 518 140
                 C 525 150 520 170 508 185
                 C 515 182 522 190 520 200
                 C 515 215 495 220 488 235"
              stroke="url(#lionGold)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              className="heraldic-line"
            />
            {/* Китиця хвоста */}
            <path
              d="M 518 140 C 525 125 512 112 502 120 C 495 125 505 138 518 140 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="1.5"
            />

            {/* Передні лапи, що спираються на щит */}
            <path
              d="M 365 165 L 338 160 L 335 168 L 360 175 Z
                 M 360 195 L 336 192 L 334 200 L 362 205 Z"
              fill="url(#lionGold)"
              stroke="#713f12"
              strokeWidth="2"
            />
            <path d="M 335 158 L 330 160 M 333 167 L 328 168 M 334 190 L 329 192 M 332 199 L 327 200" stroke="#fff" strokeWidth="2" />
          </g>

          {/* ========================================================= */}
          {/* 4. ЦЕНТРАЛЬНИЙ ГЕРБОВИЙ ЩИТ (The Central Red Shield) */}
          {/* ========================================================= */}
          <g>
            {/* Зовнішній золотий орнаментальний контур */}
            <path
              d="M 200 118
                 H 340
                 C 340 180 348 245 315 285
                 C 290 315 270 332 270 332
                 C 270 332 250 315 225 285
                 C 192 245 200 180 200 118 Z"
              fill="url(#royalGold)"
              stroke="#581c87"
              strokeWidth="1"
            />

            {/* Внутрішнє червоне поле щита (Gules) */}
            <path
              d="M 206 124
                 H 334
                 C 334 182 342 240 310 278
                 C 288 305 270 322 270 322
                 C 270 322 252 305 230 278
                 C 198 240 206 182 206 124 Z"
              fill="url(#shieldRuby)"
              stroke="#fbbf24"
              strokeWidth="3.5"
              className="heraldic-fill"
            />

            {/* ========================================================= */}
            {/* 5. СВЯТИЙ ЮРІЙ ЗМІЄБОРЕЦЬ НА БІЛОМУ КОНІ (St. George on Horse) */}
            {/* ========================================================= */}
            {/* Німб над головою вершника */}
            <circle cx="288" cy="158" r="9" fill="url(#royalGold)" stroke="#fef08a" strokeWidth="1.5" />

            {/* Плащ вершника, що майорить позаду */}
            <path
              d="M 288 166 C 305 162 318 170 322 185 C 314 188 300 182 292 182 Z"
              fill="#ffffff"
              opacity="0.95"
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            {/* Вершник (лицар у срібних обладунках) */}
            <path
              d="M 286 162 L 290 174 L 282 188 L 274 184 L 280 172 Z"
              fill="url(#horseSilver)"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Білий бойовий кінь у галопі */}
            {/* Тіло та шия коня */}
            <path
              d="M 282 188
                 C 272 178 258 174 246 165
                 C 240 160 236 150 232 154
                 C 228 158 232 168 230 174
                 C 225 180 234 188 242 192
                 C 246 195 240 205 235 212
                 C 228 220 220 222 214 220
                 L 212 214
                 C 222 210 228 200 235 194
                 C 245 190 252 200 260 206
                 C 275 218 290 220 304 220
                 L 310 235
                 L 316 233
                 L 308 214
                 C 305 204 298 196 282 188 Z"
              fill="url(#horseSilver)"
              stroke="#1e293b"
              strokeWidth="2"
              className="heraldic-fill"
            />
            {/* Передня піднята нога коня */}
            <path
              d="M 242 192 L 222 202 L 210 196 L 212 192 L 224 196 L 244 188 Z"
              fill="url(#horseSilver)"
              stroke="#1e293b"
              strokeWidth="1.5"
            />
            {/* Хвіст коня */}
            <path
              d="M 304 204 C 322 210 326 225 328 242 C 322 238 316 226 308 214 Z"
              fill="url(#horseSilver)"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Золотий довгий спис, що встромляється у пащу дракона */}
            <line
              x1="272"
              y1="140"
              x2="238"
              y2="258"
              stroke="url(#royalGold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="heraldic-line"
            />
            {/* Вістря списа */}
            <polygon points="238,258 233,266 242,264" fill="#fef08a" stroke="#78350f" strokeWidth="1" />

            {/* Повалений змій / дракон під копитами */}
            <path
              d="M 225 258
                 C 232 250 248 248 260 254
                 C 272 260 285 260 296 252
                 C 290 262 278 266 265 264
                 C 250 262 242 270 235 272
                 C 225 274 218 266 225 258 Z"
              fill="#94a3b8"
              stroke="#0f172a"
              strokeWidth="1.8"
            />
            {/* Крило дракона */}
            <path
              d="M 252 250 L 262 236 L 268 252 Z"
              fill="#64748b"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>

          {/* ========================================================= */}
          {/* 6. БАРОКОВИЙ РОСЛИННИЙ ПОСТАМЕНТ ТА ДЕКОРАТИВНЕ ПЛЕТИВО */}
          {/* ========================================================= */}
          <g fill="none" stroke="url(#royalGold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="heraldic-line">
            {/* Лівий завиток під щитом */}
            <path d="M 220 320 C 180 345 150 330 140 360 C 160 375 200 365 235 345" />
            <path d="M 160 345 C 175 330 205 335 220 350" />
            {/* Правий завиток під щитом */}
            <path d="M 320 320 C 360 345 390 330 400 360 C 380 375 340 365 305 345" />
            <path d="M 380 345 C 365 330 335 335 320 350" />
            {/* Центральна розета/хрест унизу */}
            <circle cx="270" cy="348" r="7" fill="url(#royalGold)" stroke="#78350f" strokeWidth="2" />
          </g>

          {/* ========================================================= */}
          {/* 7. ГЕРБОВА СТРІЧКА З ДЕВІЗОМ (Motto Ribbon) */}
          {/* ========================================================= */}
          <g>
            {/* Тінь стрічки та червона зворотна підкладка */}
            <path
              d="M 115 375 L 140 355 L 148 375 L 125 392 Z
                 M 425 375 L 400 355 L 392 375 L 415 392 Z"
              fill="#991b1b"
            />
            {/* Біла розгорнута стрічка */}
            <path
              d="M 120 380
                 C 170 355 220 372 270 372
                 C 320 372 370 355 420 380
                 L 435 365
                 C 380 340 325 356 270 356
                 C 215 356 160 340 105 365 Z"
              fill="#f8fafc"
              stroke="url(#royalGold)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="heraldic-fill"
            />
            {/* Червоні болніські хрести на краях стрічки */}
            <path d="M 116 370 L 124 370 M 120 366 L 120 374" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="square" />
            <path d="M 420 370 L 428 370 M 424 366 L 424 374" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="square" />

            {/* Девіз на стрічці (вишуканий старовинний шрифт) */}
            <text
              x="270"
              y="368"
              textAnchor="middle"
              className="font-serif font-black tracking-[0.25em] text-[13px] fill-slate-900 select-none"
            >
              ძალა ერთობაშია · СИЛА В ЄДНОСТІ
            </text>
          </g>
        </svg>
      </div>

      {/* Інформація про успішно створену лігу */}
      <div className="max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-950/60 px-4 py-1 text-xs font-black uppercase tracking-widest text-amber-300 shadow-lg">
          <span>👑</span>
          <span>КОРОЛІВСЬКА ВІДЗНАКА · НОВА ЛІГА СТВОРЕНА</span>
        </div>

        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
          {leagueTitle || "НОВА ЛІГА СТВОРЕНА!"}
        </h2>

        {inviteCode && (
          <p className="mt-1 font-mono text-xs font-bold text-amber-400">
            КОД ЗАПРОШЕННЯ: <span className="rounded bg-amber-500/20 px-2 py-0.5 text-white tracking-widest">{inviteCode}</span>
          </p>
        )}

        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          Гербова відзнака пошани: здиблені золоті леви та лицарська звитяга відкривають ваш турнір!
        </p>

        <p className="mt-6 font-mono text-[11px] text-slate-500 hover:text-slate-300 transition">
          (натисніть будь-де, щоб перейти до ліги)
        </p>
      </div>
    </div>
  );
}
