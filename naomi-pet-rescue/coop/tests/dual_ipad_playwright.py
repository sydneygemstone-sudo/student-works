import time
import subprocess
import os
import sys
from playwright.sync_api import sync_playwright

def run_dual_ipad_simulation():
    # 1. 启动本地 Node 服务
    server_cmd = ["node", "server/index.js"]
    env = os.environ.copy()
    env["PORT"] = "8990"
    proc = subprocess.Popen(server_cmd, cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))), env=env)
    time.sleep(1.5)

    try:
        with sync_playwright() as p:
            # iPad Pro 11 横屏模拟 (Safari WebKit)
            ipad_device = {
                "viewport": {"width": 1194, "height": 834},
                "user_agent": "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
                "has_touch": True,
                "is_mobile": True,
            }

            browser = p.webkit.launch(headless=True)

            context1 = browser.new_context(**ipad_device)
            page1 = context1.new_page()

            context2 = browser.new_context(**ipad_device)
            page2 = context2.new_page()

            base_url = "http://127.0.0.1:8990/naomi-pet-rescue/coop/"

            print("[iPad 1] 打开小熊创房页:", base_url)
            page1.goto(base_url)
            page1.wait_for_selector("#btnCreateRoomSubmit")

            # iPad 1 创建房间 (选择小熊)
            page1.click("#roleBear")
            page1.fill("#inputCreatorName", "小熊")
            page1.click("#btnCreateRoomSubmit")

            # 等待房间码生成
            page1.wait_for_selector("#displayRoomCode")
            room_code = page1.inner_text("#displayRoomCode").strip()
            print(f"[iPad 1] 成功创建房间，房间码: {room_code}")

            # iPad 2 加入房间
            join_url = f"{base_url}?room={room_code}"
            print(f"[iPad 2] 打开加入链接: {join_url}")
            page2.goto(join_url)
            page2.wait_for_selector("#btnJoinRoomSubmit")
            page2.fill("#inputJoinName", "Naomi")
            page2.click("#btnJoinRoomSubmit")

            time.sleep(1.2)
            print("[Dual iPad] 双方均已入房，开始进入游戏画面")

            # iPad 1 点击出发
            if page1.is_visible("#btnStartMission"):
                page1.click("#btnStartMission")
            # 跳过故事快速进入
            time.sleep(0.5)
            if page1.is_visible("#btnStorySkip"):
                page1.click("#btnStorySkip")
            if page2.is_visible("#btnStorySkip"):
                page2.click("#btnStorySkip")

            time.sleep(1.2)

            # 验证 3D 画布与 HUD
            assert page1.is_visible("#canvasContainer canvas")
            assert page2.is_visible("#canvasContainer canvas")

            print("[iPad 1] 触控点击 前进 按钮 (小熊迈步)")
            page1.click("#btnForward")
            time.sleep(0.6)

            print("[iPad 2] 触控点击 左转 按钮 (小兔转向)")
            page2.click("#btnTurnLeft")
            time.sleep(0.6)

            # 截图保存为交付物证据
            evidence_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "evidence")
            os.makedirs(evidence_dir, exist_ok=True)

            shot1 = os.path.join(evidence_dir, "ipad1_bear_screen.png")
            shot2 = os.path.join(evidence_dir, "ipad2_bunny_screen.png")

            page1.screenshot(path=shot1)
            page2.screenshot(path=shot2)
            print(f"[Evidence] iPad 1 (小熊越肩视角) 截图已保存至: {shot1}")
            print(f"[Evidence] iPad 2 (小兔越肩视角) 截图已保存至: {shot2}")

            # 测试石头阻挡与 Naomi 箭头提示：
            # 小兔右转朝东 -> 向前移动两步撞上 (7,4) 石头
            page2.click("#btnTurnRight")
            time.sleep(0.3)
            page2.click("#btnTurnRight")
            time.sleep(0.3)
            page2.click("#btnForward") # 到 (5,4)
            time.sleep(0.4)
            page2.click("#btnForward") # 到 (6,4)
            time.sleep(0.4)
            page2.click("#btnForward") # 正对 (7,4) 石头！触发 Naomi 石头箭头！
            time.sleep(0.6)

            shot_hint = os.path.join(evidence_dir, "naomi_stone_arrow_hint.png")
            page2.screenshot(path=shot_hint)
            print(f"[Evidence] Naomi 石头阻挡提示截图已保存至: {shot_hint}")

            # 双方确认结束回合测试
            print("[Dual iPad] 双方点击 结束本回合 按钮")
            page1.click("#btnToggleReady")
            time.sleep(0.4)
            page2.click("#btnToggleReady")
            time.sleep(0.8)

            # 验证推进到第 2 回合
            round_text = page1.inner_text("#roundDisplay")
            print(f"[Dual iPad] 共同回合推进验证成功: {round_text}")
            assert "第 2 / 14 共同回合" in round_text

            browser.close()
            print("[Dual iPad Test] 双 iPad Safari WebKit 端到端自动化测试全部通过！")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    run_dual_ipad_simulation()
