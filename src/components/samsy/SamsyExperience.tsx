"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { EngineStats } from "@/types/samsy";

const CyberCityCanvas = dynamic(
  () => import("./CyberCityCanvas").then((m) => m.CyberCityCanvas),
  { ssr: false },
);

function sendKey(code: string, type: "keydown" | "keyup") {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

export function SamsyExperience() {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [dayMode, setDayMode]               = useState(false);
  const [stats, setStats]                   = useState<EngineStats>({
    fps: 0,
    frameMs: 0,
    engine: "WebGL",
    x: 0,
    y: 0,
    z: 0,
    marks: [],
  });
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [engineReady, setEngineReady]   = useState(false);

  const showLoadingScreen = webglAvailable !== false && !engineReady;

  // Kill-switch listener
  useEffect(() => {
    const handleKillSwitch = () => setKillSwitchTriggered(true);
    window.addEventListener("samsy-cpu-killswitch", handleKillSwitch);
    return () => window.removeEventListener("samsy-cpu-killswitch", handleKillSwitch);
  }, []);

  // WebGL check
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const canvas    = document.createElement("canvas");
      const available = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
      setWebglAvailable(available);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="samsy-app mode-explore">
      {/* ── 3D City ───────────────────────────────────────────────────────── */}
      {webglAvailable === true && (
        <CyberCityCanvas
          mode="explore"
          dayMode={dayMode}
          onProgress={setLoadProgress}
          onReady={() => setEngineReady(true)}
          onStats={setStats}
        />
      )}

      {/* ── WebGL fallback ─────────────────────────────────────────────────── */}
      {webglAvailable === false && (
        <div className="webgl-fallback" role="img" aria-label="Static preview of the cybercity" />
      )}

      <div className="samsy-vignette"  aria-hidden="true" />
      <div className="samsy-scanlines" aria-hidden="true" />

      {/* ── Loading screen ──────────────────────────────────────────────── */}
      <div
        className={`loading-screen${showLoadingScreen ? "" : " is-done"}`}
        role="status"
        aria-live="polite"
        aria-hidden={!showLoadingScreen}
      >
        <div className="loading-eyes" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="loading-track">
          <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, loadProgress / 100))})` }} />
        </div>
        <small>ENTERING CYBERCITY — {Math.round(loadProgress)}%</small>
      </div>

      {/* ── Day mode toggle (top-left) ─────────────────────────────────────── */}
      <button
        type="button"
        className={`day-toggle${dayMode ? " is-active" : ""}`}
        aria-pressed={dayMode}
        aria-label={dayMode ? "Switch to night mode" : "Switch to day mode"}
        onClick={() => setDayMode((v) => !v)}
      >
        {dayMode ? "DAY" : "NIGHT"}
      </button>

      {/* ── Engine stats ────────────────────────────────────────────────────── */}
      <header className="samsy-header">
        <div className="engine-stats" aria-live="polite">
          <div>Engine: {stats.engine}, Frame: {stats.frameMs.toFixed(1)} ms, {stats.fps} FPS</div>
          <div className="location-tracker">
            X: {stats.x.toFixed(2)}  Y: {stats.y.toFixed(2)}  Z: {stats.z.toFixed(2)}
          </div>
          {stats.marks.length > 0 && (
            <div className="location-marks">
              {stats.marks.map((mark, index) => (
                <div key={"m-" + String(index)}>
                  M{index + 1}: {mark.x.toFixed(2)}  {mark.y.toFixed(2)}  {mark.z.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile controls ─────────────────────────────────────────────────── */}
      <div className="mobile-controls" aria-label="Mobile movement controls">
        <div className="mobile-dpad">
          <button type="button" onPointerDown={() => sendKey("KeyW", "keydown")} onPointerUp={() => sendKey("KeyW", "keyup")}>▲</button>
          <button type="button" onPointerDown={() => sendKey("KeyA", "keydown")} onPointerUp={() => sendKey("KeyA", "keyup")}>◀</button>
          <button type="button" onPointerDown={() => sendKey("KeyS", "keydown")} onPointerUp={() => sendKey("KeyS", "keyup")}>▼</button>
          <button type="button" onPointerDown={() => sendKey("KeyD", "keydown")} onPointerUp={() => sendKey("KeyD", "keyup")}>▶</button>
        </div>
        <button
          type="button"
          className="mobile-jump"
          onPointerDown={() => sendKey("Space", "keydown")}
          onPointerUp={() => sendKey("Space", "keyup")}
        >
          JUMP
        </button>
        <button
          type="button"
          className="mobile-fly-up"
          aria-label="Hold to fly up"
          onPointerDown={() => sendKey("Space", "keydown")}
          onPointerUp={() => sendKey("Space", "keyup")}
        >
          FLY ▲
        </button>
        <button
          type="button"
          className="mobile-fly-down"
          aria-label="Hold to fly down"
          onPointerDown={() => sendKey("ControlLeft", "keydown")}
          onPointerUp={() => sendKey("ControlLeft", "keyup")}
        >
          FLY ▼
        </button>
        <button
          type="button"
          className="mobile-auto-descend"
          aria-label="Auto-descend to ground"
          onPointerDown={() => sendKey("KeyX", "keydown")}
          onPointerUp={() => sendKey("KeyX", "keyup")}
        >
          LAND
        </button>
      </div>

      {/* ── CPU kill-switch banner ────────────────────────────────────────── */}
      {killSwitchTriggered && (
        <div
          style={{
            position: "fixed", top: 20, left: "50%",
            transform: "translateX(-50%)", zIndex: 9999,
            backgroundColor: "rgba(10,0,0,0.92)",
            border: "1px solid #ff3366", borderRadius: "6px",
            padding: "12px 20px", color: "#ff3366",
            fontFamily: "monospace", fontSize: "13px",
            display: "flex", alignItems: "center", gap: "12px",
            boxShadow: "0 0 24px rgba(255,51,102,0.5)", whiteSpace: "nowrap",
          }}
          role="alert"
        >
          <span>⚠ <strong>CPU KILL SWITCH</strong> — Engine paused (high load &gt;10s)</span>
          <button
            type="button"
            onClick={() => {
              setKillSwitchTriggered(false);
              window.dispatchEvent(new CustomEvent("samsy-resume-cpu-killswitch"));
            }}
            style={{
              backgroundColor: "#ff3366", color: "#fff", border: "none",
              padding: "6px 14px", borderRadius: "4px", cursor: "pointer",
              fontWeight: "bold", fontFamily: "monospace",
            }}
          >
            RESUME
          </button>
        </div>
      )}
    </main>
  );
}
