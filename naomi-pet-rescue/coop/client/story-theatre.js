/**
 * Naomi《小动物回家》双 iPad 联机版 —— 故事剧场模块
 * 复用原版 IndexTTS 2.5 纯正旁白与精美花园插画
 */
(() => {
  'use strict';

  const scenes = {
    party: {
      title: '藏好了吗？派对开始啦！',
      text: '花园里正在开派对。小动物们吃过点心，跑到树后、花丛和树篱迷宫里，玩起了捉迷藏。',
      label: '花园派对',
      x: 0,
      y: 0,
      mood: 'sunny',
      seconds: 11,
    },
    storm: {
      title: '轰隆！雨云追来了……',
      text: '忽然，天空黑了下来，风把彩旗吹得呼啦啦响。小伙伴们还散落在花园各处：“我们害怕，谁来接我们回家？”',
      label: '突如其来的暴风雨',
      x: 100,
      y: 0,
      mood: 'storm',
      seconds: 15,
    },
    rescue: {
      title: '别怕，我们来接你们！',
      text: '小熊和小兔牵起手：“一个也不能落下！”赶在暴风雨前，穿过迷宫与森林，把八位小伙伴都送回中间的小屋吧。',
      label: '双人联机救援队，出发！',
      x: 0,
      y: 100,
      mood: 'brave',
      seconds: 13,
    },
    feast: {
      title: '这一桌好吃的，送给小英雄！',
      text: '八位小伙伴都平安到家啦！大家端来蛋糕、水果和热汤：“谢谢小熊和小兔！”窗外下着雨，屋里暖暖的，我们的派对团圆啦！',
      label: '救援大胜利！团圆宴会',
      x: 100,
      y: 100,
      mood: 'celebrate',
      seconds: 18,
    },
  };

  class StoryTheatre {
    constructor() {
      this.active = false;
      this.paused = false;
      this.muted = false;
      this.volume = 0.5;
      this.sequence = [];
      this.index = 0;
      this.onDone = null;

      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.createDom();
    }

    createDom() {
      this.root = document.createElement('div');
      this.root.className = 'modal-overlay story-modal hidden';
      this.root.innerHTML = `
        <div class="modal-card story-card" style="max-width: 680px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 800; color: #2e7d32; font-size: 15px;">NAOMI · 小动物回家</span>
            <span id="storyChapterLabel" style="font-size: 13px; color: #666; font-weight: 600;"></span>
          </div>
          <div style="position: relative; width: 100%; height: 260px; border-radius: 16px; overflow: hidden; background: #222; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div id="storyArtBg" style="width: 200%; height: 200%; background-image: url('assets/story/garden-story.png'); background-size: cover; transition: transform 0.8s ease;"></div>
            <div id="storySceneBadge" style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.65); color: #fff; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;"></div>
          </div>
          <h2 id="storyTitle" style="font-size: 20px; font-weight: 900; color: #1b5e20; margin-bottom: 8px;"></h2>
          <p id="storyText" style="font-size: 15px; color: #444; line-height: 1.6; min-height: 48px; margin-bottom: 16px;"></p>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; gap: 8px;">
              <button id="btnStoryAudio" type="button" class="btn-action" style="min-height: 44px; padding: 0 14px; font-size: 13px;">🔊 声音开启</button>
              <button id="btnStorySkip" type="button" class="btn-action" style="min-height: 44px; padding: 0 14px; font-size: 13px; color: #777;">跳过故事</button>
            </div>
            <button id="btnStoryNext" type="button" class="btn-primary" style="width: auto; padding: 0 28px; height: 44px; font-size: 15px;">下一幕 →</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.root);

      this.root.querySelector('#btnStoryNext').onclick = () => this.next();
      this.root.querySelector('#btnStorySkip').onclick = () => this.finish();
      this.root.querySelector('#btnStoryAudio').onclick = () => this.toggleAudio();
    }

    play(mode = 'intro', onComplete = null) {
      this.sequence = mode === 'ending' ? ['feast'] : ['party', 'storm', 'rescue'];
      this.index = 0;
      this.active = true;
      this.onDone = onComplete;
      this.root.classList.remove('hidden');
      this.showScene();
    }

    showScene() {
      if (!this.active || this.index >= this.sequence.length) {
        this.finish();
        return;
      }

      const key = this.sequence[this.index];
      const scene = scenes[key];

      this.root.querySelector('#storyChapterLabel').textContent =
        this.sequence.length === 1 ? '胜利 · 团圆宴会' : `第 ${this.index + 1} / ${this.sequence.length} 幕`;
      this.root.querySelector('#storyTitle').textContent = scene.title;
      this.root.querySelector('#storyText').textContent = scene.text;
      this.root.querySelector('#storySceneBadge').textContent = scene.label;

      const art = this.root.querySelector('#storyArtBg');
      art.style.transform = `translate(-${scene.x * 0.5}%, -${scene.y * 0.5}%) scale(1.05)`;

      const nextBtn = this.root.querySelector('#btnStoryNext');
      nextBtn.textContent =
        this.index < this.sequence.length - 1 ? '下一幕 →' : this.sequence.length === 1 ? '收下感谢 ♥' : '出发救援 →';

      // 播放原版 TTS 配音
      this.audio.pause();
      this.audio.src = `assets/story/${key}-indextts25.wav`;
      this.audio.volume = this.muted ? 0 : this.volume;
      this.audio.play().catch(() => {});
    }

    toggleAudio() {
      this.muted = !this.muted;
      this.audio.volume = this.muted ? 0 : this.volume;
      this.root.querySelector('#btnStoryAudio').textContent = this.muted ? '🔇 声音已静音' : '🔊 声音开启';
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
      this.root.classList.add('hidden');
      if (this.onDone) {
        const cb = this.onDone;
        this.onDone = null;
        cb();
      }
    }
  }

  window.StoryTheatre = StoryTheatre;
})();
