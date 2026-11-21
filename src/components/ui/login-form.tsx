"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, User } from "lucide-react";

import { ApiError, getJson, postJson } from "@/lib/client";

/* ------------------------------------------------------------------ */
/* Smokey shader background — cobalt glow over ink, mouse-reactive     */
/* ------------------------------------------------------------------ */

const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.substring(1, 3), 16) / 255,
    parseInt(hex.substring(3, 5), 16) / 255,
    parseInt(hex.substring(5, 7), 16) / 255,
  ];
}

/**
 * Interactive WebGL shader backdrop — a smoky cobalt glow that ripples
 * toward the pointer. Pointer state lives in refs so the shader compiles
 * once and the render loop is never torn down on mouse movement. Users
 * who prefer reduced motion get a single static frame instead of the
 * animation loop.
 */
export function SmokeyBackground({
  color = "#2f4fd8", // Kadi cobalt accent
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return; // No WebGL: the ink background underneath stands in.

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uColorLocation = gl.getUniformLocation(program, "u_color");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColorLocation, r, g, b);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startTime = Date.now();
    let rafId = 0;

    const draw = (timeSeconds: number) => {
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, timeSeconds);
      gl.uniform2f(
        iMouseLocation,
        pointer.current.active ? pointer.current.x * dpr : width / 2,
        pointer.current.active ? height - pointer.current.y * dpr : height / 2,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const render = () => {
      draw((Date.now() - startTime) / 1000);
      rafId = requestAnimationFrame(render);
    };

    if (reduceMotion) {
      draw(0); // Single static frame; no loop.
    } else {
      render();
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    };
    const handleMouseLeave = () => {
      pointer.current.active = false;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [color]);

  return (
    <div className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Glass login form — Kadi palette: ink chrome, cobalt actions         */
/* ------------------------------------------------------------------ */

/**
 * Glassmorphism sign-in card over the smoky backdrop. Email/password posts
 * to the existing session endpoint; the Google button runs the same OAuth
 * flow as the rest of the app (fetch the auth URL, then navigate to it).
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/auth/login", { email, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not sign you in. Try again.");
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const { authUrl } = await getJson<{ authUrl: string }>("/api/auth/google");
      window.location.href = authUrl;
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not start Google sign-in. Try again.");
      setGoogleBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="text-center">
        <h2 className="font-serif text-3xl tracking-tight text-white">Welcome back</h2>
        <p className="mt-2 text-sm text-white/60">Sign in to your research studio.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-bad/40 bg-bad/15 px-3.5 py-3 text-[13px] leading-relaxed text-[#ffb4ab]">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-8">
        {/* Email — floating label */}
        <div className="relative z-0">
          <input
            type="email"
            id="login_email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder=" "
            className="peer block w-full appearance-none rounded-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-sm text-white focus:border-accent-soft focus:outline-none focus:ring-0"
          />
          <label
            htmlFor="login_email"
            className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-focus:left-0 peer-focus:text-accent-soft peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
          >
            <User className="mr-2 -mt-1 inline-block" size={16} />
            Email address
          </label>
        </div>

        {/* Password — floating label */}
        <div className="relative z-0">
          <input
            type="password"
            id="login_password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder=" "
            className="peer block w-full appearance-none rounded-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-sm text-white focus:border-accent-soft focus:outline-none focus:ring-0"
          />
          <label
            htmlFor="login_password"
            className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-focus:left-0 peer-focus:text-accent-soft peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
          >
            <Lock className="mr-2 -mt-1 inline-block" size={16} />
            Password
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || googleBusy}
          className="group flex w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:border-accent-2 hover:bg-accent-2 focus:outline-none focus:ring-2 focus:ring-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
          {busy ? null : (
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          )}
        </button>

        <div className="relative flex items-center py-2">
          <div className="grow border-t border-white/20" />
          <span className="mx-4 shrink-0 text-xs text-white/50">OR CONTINUE WITH</span>
          <div className="grow border-t border-white/20" />
        </div>

        <button
          type="button"
          onClick={googleSignIn}
          disabled={busy || googleBusy}
          className="flex w-full items-center justify-center rounded-lg bg-white/95 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"
            />
          </svg>
          {googleBusy ? "Opening Google…" : "Sign in with Google"}
        </button>
      </form>

      <p className="text-center text-xs text-white/50">
        New to the studio?{" "}
        <Link
          href="/register"
          className="font-semibold text-accent-soft underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}