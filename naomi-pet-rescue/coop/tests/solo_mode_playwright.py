import time
import subprocess
import os
from playwright.sync_api import sync_playwright

def test_solo_mode():
    coop_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_cmd = ["node", "server/index.js"]
    env = os.environ.copy()
    env["PORT"] = "8992"
    proc = subprocess.Popen(server_cmd, cwd=coop_dir, env=env)
    time.sleep(1.5)

    try:
        with sync_playwright() as p:
            # iPad Pro 11 横屏模拟
            device = {
                "viewport": {"width": 1194, "height": 834},
                "user_agent": "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
                "has_touch": True,
                "is_mobile": True,
            }
            browser = p.webkit.launch(headless=True)
            page = browser.new_page(**device)

            base_url = "http://127.0.0.1:8992/naomi-pet-rescue/coop/"
            print("[Solo Test] 打开大厅:", base_url)
            page.goto(base_url)
            page.wait_for_selector("#tabBtnSolo")

            # 点击单人测试模式选项卡
            page.click("#tabBtnSolo")
            time.sleep(0.5)

            # 点击开始单人测试冒险
            page.click("#btnStartSoloSubmit")
            time.sleep(0.8)

            # 跳过片头剧情
            if page.is_visible("#btnStorySkip"):
                page.click("#btnStorySkip")
                time.sleep(0.5)

            evidence_dir = os.path.join(coop_dir, "evidence")
            os.makedirs(evidence_dir, exist_ok=True)

            # 1. 截取小熊控制视角
            page.screenshot(path=os.path.join(evidence_dir, "solo_mode_bear.png"))
            print("[Solo Test] 已截取小熊视角:", os.path.join(evidence_dir, "solo_mode_bear.png"))

            # 2. 点击切换角色按钮（或按 Tab 键）切换至小兔
            page.click("#btnSwitchSoloPlayer")
            time.sleep(0.8)

            # 3. 截取小兔控制视角
            page.screenshot(path=os.path.join(evidence_dir, "solo_mode_bunny.png"))
            print("[Solo Test] 已截取小兔视角:", os.path.join(evidence_dir, "solo_mode_bunny.png"))

            # 4. 测试走步与一键推进
            page.click("#btnForward")
            time.sleep(0.5)
            page.click("#btnSoloAdvanceRound")
            time.sleep(0.8)

            print("[Solo Test] 单人测试模式完整通过！")
            browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    test_solo_mode()
