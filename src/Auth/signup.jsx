import React, { useEffect, useState, useRef } from "react";
import { FaGoogle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../Services/Toast";

// Simple client-side OTP signup flow (simulation).
// On submit: generate OTP, "send" it (console.log) and show OTP input.
// Only after correct OTP entry the user is persisted (localStorage) and redirected to /login.

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(""); // actual otp stored in state (server would store it)
  const [inputOtp, setInputOtp] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // countdown timer for resend; when resendTimer > 0 start interval to decrement every second
    if (resendTimer <= 0) return;
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resendTimer]);

  const generateAndSendOtp = (toEmail) => {
    // call backend to request OTP (use relative path in dev so Vite proxy handles it)
    const BACKEND = import.meta.env.DEV
      ? ""
      : import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    fetch(`${BACKEND}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    })
      .then(async (r) => {
        console.log("[Signup] send-otp status:", r.status, r.statusText);
        const txt = await r.text().catch(() => "");
        console.log("[Signup] send-otp body:", txt);
        if (!r.ok) throw new Error(txt || "Failed to send OTP");
        let parsed = {};
        if (txt) {
          try {
            parsed = JSON.parse(txt);
          } catch {
            parsed = { message: txt };
          }
        }
        return parsed;
      })
      .then(() => {
        setOtpSent(true);
        setResendTimer(60);
        showToast({ message: "OTP sent to your email", type: "info" });
      })
      .catch((err) => {
        console.error("send-otp failed:", err);
        // fallback to local simulation
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setOtp(code);
        console.log(`Fallback sending OTP ${code} to ${toEmail}`);
        setOtpSent(true);
        setResendTimer(60);
        showToast({
          message: "OTP send failed; fallback code logged to console",
          type: "error",
        });
      });
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setError("");
    const errs = { name: "", email: "", password: "", confirm: "" };

    // Name: only letters and spaces, at least 3 letters total
    if (
      !name ||
      !/^[A-Za-z\s]+$/.test(name) ||
      name.replace(/\s+/g, "").length < 3
    ) {
      errs.name =
        "Name must contain at least 3 letters and only letters/spaces";
    }

    // Email simple validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }

    // Password: min 6, at least one letter, one digit, one special char
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (
      !password ||
      password.length < 6 ||
      !hasLetter ||
      !hasDigit ||
      !hasSpecial
    ) {
      errs.password =
        "Password must be at least 6 chars and include a letter, a digit, and a special character";
    }

    if (!confirm || password !== confirm) {
      errs.confirm = "Passwords do not match";
    }

    setFieldErrors(errs);

    const hasAny = Object.values(errs).some((v) => v);
    if (hasAny) {
      setError("Please fix the highlighted errors");
      return;
    }

    // all good — send OTP
    generateAndSendOtp(email);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError("");
    const BACKEND = import.meta.env.DEV
      ? ""
      : import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    fetch(`${BACKEND}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code: inputOtp }),
    })
      .then(async (r) => {
        console.log("[Signup] verify-otp status:", r.status, r.statusText);
        const txt = await r.text().catch(() => "");
        console.log("[Signup] verify-otp body:", txt);
        let data = {};
        if (txt) {
          try {
            data = JSON.parse(txt);
          } catch {
            data = { error: txt };
          }
        }
        return { ok: r.ok, status: r.status, ...data };
      })
      .then((data) => {
        if (data && data.ok) {
          setOtpSent(false);
          showToast({
            message: "Account created — please log in",
            type: "success",
            duration: 2500,
          });
          navigate("/login");
        } else {
          setError((data && (data.error || data.message)) || "Invalid code");
        }
      })
      .catch((err) => {
        console.error("verify-otp failed:", err);
        // fallback: if a local OTP was generated (fallback send), accept it for testing
        if (otpSent && otp && inputOtp === otp) {
          const users = JSON.parse(localStorage.getItem("users") || "[]");
          users.push({ name, email, password });
          localStorage.setItem("users", JSON.stringify(users));
          setOtpSent(false);
          showToast({
            message: "Account created (local), please log in",
            type: "success",
            duration: 2500,
          });
          navigate("/login");
          return;
        }
        setError("Verification failed");
      });
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    generateAndSendOtp(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="relative bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              We'll send a one-time code to verify your email
            </p>
          </div>

          {!otpSent ? (
            <form className="space-y-4" onSubmit={handleInitialSubmit}>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl ${
                      fieldErrors.name ? "border-red-500" : ""
                    }`}
                    type="text"
                    placeholder="Full name"
                    required
                  />
                  {fieldErrors.name && (
                    <div className="text-red-600 text-sm mt-1">
                      {fieldErrors.name}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl ${
                      fieldErrors.email ? "border-red-500" : ""
                    }`}
                    type="email"
                    placeholder="Email address"
                    required
                  />
                  {fieldErrors.email && (
                    <div className="text-red-600 text-sm mt-1">
                      {fieldErrors.email}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl ${
                      fieldErrors.password ? "border-red-500" : ""
                    }`}
                    type="password"
                    placeholder="Password"
                    required
                  />
                  {fieldErrors.password && (
                    <div className="text-red-600 text-sm mt-1">
                      {fieldErrors.password}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl ${
                      fieldErrors.confirm ? "border-red-500" : ""
                    }`}
                    type="password"
                    placeholder="Confirm password"
                    required
                  />
                  {fieldErrors.confirm && (
                    <div className="text-red-600 text-sm mt-1">
                      {fieldErrors.confirm}
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              <button className="w-full py-3 bg-sky-600 text-white rounded-xl font-semibold">
                Send verification code
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div className="text-sm text-slate-600">
                An OTP was sent to <span className="font-medium">{email}</span>.
                Enter it below to complete registration.
              </div>
              <input
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="Enter 6-digit code"
              />
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl"
                >
                  Verify & Register
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className="px-3 py-2 border rounded-xl text-sm"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                </button>
              </div>
            </form>
          )}

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <div className="text-xs text-slate-400">or continue with</div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            className="w-full flex items-center justify-center gap-3 py-3 border rounded-xl hover:shadow-md transition"
            aria-label="Continue with Google"
          >
            <FaGoogle className="text-red-500" />
            <span className="text-sm font-medium">Continue with Google</span>
          </button>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-sky-600">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          By continuing you agree to our{" "}
          <a href="#" className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
