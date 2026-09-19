/**
 * client/story-theatre.js — 故事剧场（Claude Opus 版）
 *
 * 复用原版绘本桌游的 IndexTTS 2.5 旁白配音与花园插画，把开场绘本与通关宴会
 * 接进 3D 联机/离线版。移植自 coop/client/story-theatre.js，改为 ESM 模块并
 * 改用本版的 .modal-backdrop / .modal-box 样式约定。
 *
 * 资源位于 naomi-pet-rescue/assets/story/，相对本文件是 ../../assets/story/，
 * 这样在 GitHub Pages 这类纯静态托管下也能直接取到（不依赖服务器路由）。
 */

const ASSET_BASE = new URL('../../assets/story/', import.meta.url).href;

const SCENES = {
  party: {
    title: '藏好了吗？派对开始啦！',
    text: '花园里正在开派对。小动物们吃过点心，跑到树后、花丛和树篱迷宫里，玩起了捉迷藏。',
    label: '花园派对',
    x: 0,
    y: 0
  },
  storm: {
    title: '轰隆！雨云追来了……',
    text: '忽然，天空黑了下来，风把彩旗吹得呼啦啦响。小伙伴们还散落在花园各处：“我们害怕，谁来接我们回家？”',
    label: '突如其来的暴风雨',
    x: 100,
    y: 0
  },
  rescue: {
    title: '别怕，我们来接你们！',
    text: '小熊和小兔牵起手：“一个也不能落下！”赶在暴风雨前，穿过迷宫与森林，把八位小伙伴都送回中间的小屋吧。',
    label: '双人救援队，出发！',
    x: 0,
    y: 100
  },
  feast: {
    title: '这一桌好吃的，送给小英雄！',
    text: '八位小伙伴都平安到家啦！大家端来蛋糕、水果和热汤：“谢谢小熊和小兔！”窗外下着雨，屋里暖暖的，我们的派对团圆啦！',
    label: '救援大胜利！团圆宴会',
    x: 100,
    y: 100
  }
};

const INTRO_SEQUENCE = ['party', 'storm', 'rescue'];
const ENDING_SEQUENCE = ['feast'];

// 看过开场就不再重复播放，刷新页面或重开一局才会重置
const SEEN_KEY = 'naomi-story-intro-seen';

export class StoryTheatre {
  constructor() {
    this.active = false;
    this.muted = false;
    this.volume = 0.6;
    this.sequence = [];
    this.index = 0;
    this.onDone = null;

    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.buildDom();
  }

  buildDom() {
    this.root = document.createElement('div');
    this.root.className = 'modal-backdrop';
    this.root.style.display = 'none';
    this.root.style.zIndex = '60';
    this.root.innerHTML = `
      <div class="modal-box" style="max-width: 640px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-weight:800; color:#2e7d32; font-size:14px;">NAOMI · 小动物回家</span>
          <span data-chapter style="font-size:13px; color:#64748b; font-weight:600;"></span>
        </div>
        <div style="position:relative; width:100%; aspect-ratio:3/2; border-radius:14px; overflow:hidden; background:#1f2937; margin-bottom:14px;">
          <div data-art style="position:absolute; inset:0; width:100%; height:100%; background-image:url('${ASSET_BASE}garden-story.png'); background-size:200% 200%; background-position:0% 0%; transition:background-position .8s ease;"></div>
          <div data-badge style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,.65); color:#fff; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:700;"></div>
        </div>
        <div class="modal-title" data-title style="font-size:19px;"></div>
        <div class="modal-desc" data-text style="min-height:66px;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="display:flex; gap:8px;">
            <button type="button" data-audio class="btn-ctl" style="padding:0 14px; height:42px; font-size:13px;">🔊 声音开启</button>
            <button type="button" data-skip class="btn-ctl" style="padding:0 14px; height:42px; font-size:13px; color:#64748b;">跳过故事</button>
          </div>
          <button type="button" data-next class="solo-entry-btn" style="width:auto; padding:0 26px; height:42px; font-size:15px; margin:0;">下一幕 →</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.root);

    this.el = {
      chapter: this.root.querySelector('[data-chapter]'),
      art: this.root.querySelector('[data-art]'),
      badge: this.root.querySelector('[data-badge]'),
      title: this.root.querySelector('[data-title]'),
      text: this.root.querySelector('[data-text]'),
      audioBtn: this.root.querySelector('[data-audio]'),
      next: this.root.querySelector('[data-next]')
    };

    this.root.querySelector('[data-next]').addEventListener('click', () => this.next());
    this.root.querySelector('[data-skip]').addEventListener('click', () => this.finish());
    this.root.querySelector('[data-audio]').addEventListener('click', () => this.toggleAudio());
  }

  hasSeenIntro() {
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      return false;
    }
  }

  markIntroSeen() {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* 隐私模式下不可写，忽略即可 */
    }
  }

  /**
   * @param mode 'intro' 开场三幕绘本，'ending' 通关宴会
   * @param onComplete 播完或跳过后的回调
   */
  play(mode = 'intro', onComplete = null) {
    if (this.active) return;
    if (mode === 'intro' && this.hasSeenIntro()) {
      if (onComplete) onComplete();
      return;
    }

    this.sequence = mode === 'ending' ? [...ENDING_SEQUENCE] : [...INTRO_SEQUENCE];
    this.mode = mode;
    this.index = 0;
    this.active = true;
    this.onDone = onComplete;
    this.root.style.display = 'flex';
    this.showScene();
  }

  showScene() {
    if (!this.active || this.index >= this.sequence.length) {
      this.finish();
      return;
    }

    const key = this.sequence[this.index];
    const scene = SCENES[key];

    this.el.chapter.textContent =
      this.sequence.length === 1 ? '胜利 · 团圆宴会' : `第 ${this.index + 1} / ${this.sequence.length} 幕`;
    this.el.title.textContent = scene.title;
    this.el.text.textContent = scene.text;
    this.el.badge.textContent = scene.label;
    this.el.art.style.backgroundPosition = `${scene.x}% ${scene.y}%`;

    this.el.next.textContent =
      this.index < this.sequence.length - 1
        ? '下一幕 →'
        : this.sequence.length === 1
          ? '收下感谢 ♥'
          : '出发救援 →';

    // 原版 IndexTTS 2.5 旁白
    this.audio.pause();
    this.audio.src = `${ASSET_BASE}${key}-indextts25.wav`;
    this.audio.volume = this.muted ? 0 : this.volume;
    this.audio.play().catch(() => {
      /* 浏览器可能拦截自动播放，静默失败，文字照常可读 */
    });
  }

  toggleAudio() {
    this.muted = !this.muted;
    this.audio.volume = this.muted ? 0 : this.volume;
    this.el.audioBtn.textContent = this.muted ? '🔇 声音已静音' : '🔊 声音开启';
  }

  next() {
    if (this.index < this.sequence.length - 1) {
      this.index++;
      this.showScene();
    } else {
      this.finish();
    }
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.audio.pause();
    this.root.style.display = 'none';
    if (this.mode === 'intro') this.markIntroSeen();
    if (this.onDone) {
      const cb = this.onDone;
      this.onDone = null;
      cb();
    }
  }
}
