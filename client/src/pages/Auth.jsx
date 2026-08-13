import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Checkbox, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { login as loginRequest, register as registerRequest } from "../api/auth";
import { useForm } from "../hooks/useForm";
import { resolvePostLoginPath } from "../utils/authRedirect";

function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [tab, setTab] = useState(
    location.pathname.includes("register") ? "register" : "login"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keepLogin, setKeepLogin] = useState(true);

  const loginForm = useForm({ email: "", password: "" });
  const registerForm = useForm({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    setTab(location.pathname.includes("register") ? "register" : "login");
  }, [location.pathname]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(loginForm.values);
      login(data.token, data.user);
      void keepLogin;
      navigate(resolvePostLoginPath(location.state?.from, data.user), {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (registerForm.values.password !== registerForm.values.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const data = await registerRequest({
        name: registerForm.values.name,
        email: registerForm.values.email,
        password: registerForm.values.password,
      });
      login(data.token, data.user);
      navigate(resolvePostLoginPath(location.state?.from, data.user), {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setError("");
    navigate(next === "login" ? "/login" : "/register", {
      replace: true,
      state: location.state,
    });
  };

  return (
    <main className="auth-split">
      <section className="auth-brand-panel">
        <Link to="/" className="brand-logo">
          ODEUM
        </Link>
        <div className="auth-brand-image" aria-hidden="true" />
        <div className="auth-brand-copy">
          <h1>여섯 개의 미니멀 브랜드를 한자리에</h1>
          <p>가입 시 첫 구매 10% 쿠폰과 30일 무료 반품 혜택을 드립니다.</p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "login" ? "is-active" : ""}
            onClick={() => switchTab("login")}
          >
            로그인
          </button>
          <button
            type="button"
            className={tab === "register" ? "is-active" : ""}
            onClick={() => switchTab("register")}
          >
            회원가입
          </button>
        </div>

        {tab === "login" ? (
          <form className="auth-modern-form" onSubmit={handleLogin}>
            <Field label="이메일">
              <Input
                type="email"
                name="email"
                value={loginForm.values.email}
                onChange={loginForm.handleChange}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field label="비밀번호">
              <Input
                type="password"
                name="password"
                value={loginForm.values.password}
                onChange={loginForm.handleChange}
                required
              />
            </Field>
            <div className="auth-options">
              <Checkbox
                label="로그인 상태 유지"
                checked={keepLogin}
                onChange={(e) => setKeepLogin(e.target.checked)}
              />
              <button type="button" className="ui-btn ui-btn-text">
                아이디 · 비밀번호 찾기
              </button>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <Button type="submit" block disabled={loading}>
              {loading ? "처리 중..." : "로그인"}
            </Button>
          </form>
        ) : (
          <form className="auth-modern-form" onSubmit={handleRegister}>
            <Field label="이름">
              <Input
                name="name"
                value={registerForm.values.name}
                onChange={registerForm.handleChange}
                required
              />
            </Field>
            <Field label="이메일">
              <Input
                type="email"
                name="email"
                value={registerForm.values.email}
                onChange={registerForm.handleChange}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field label="비밀번호">
              <Input
                type="password"
                name="password"
                value={registerForm.values.password}
                onChange={registerForm.handleChange}
                required
              />
            </Field>
            <Field label="비밀번호 확인">
              <Input
                type="password"
                name="passwordConfirm"
                value={registerForm.values.passwordConfirm}
                onChange={registerForm.handleChange}
                required
              />
            </Field>
            {error ? <p className="auth-error">{error}</p> : null}
            <Button type="submit" block disabled={loading}>
              {loading ? "처리 중..." : "회원가입"}
            </Button>
          </form>
        )}

        <div className="auth-social">
          <p>간편 로그인</p>
          <div className="auth-social-row">
            <Button variant="secondary" disabled>
              카카오
            </Button>
            <Button variant="secondary" disabled>
              네이버
            </Button>
            <Button variant="secondary" disabled>
              애플
            </Button>
          </div>
        </div>

        <p className="auth-foot-note">
          {tab === "login"
            ? "아직 회원이 아니신가요? 가입하면 첫 구매 10% 쿠폰과 30일 무료 반품 혜택을 받습니다."
            : "이미 계정이 있으신가요? 로그인 탭에서 들어가 주세요."}
        </p>
      </section>
    </main>
  );
}

export default Auth;
