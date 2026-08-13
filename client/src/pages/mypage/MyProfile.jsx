import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input } from "../../components/ui";
import { getMe, updateMe } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "../../hooks/useForm";

function MyProfile() {
  const { updateUser, logout } = useAuth();
  const { values, handleChange, setValues } = useForm({
    name: "",
    phone: "",
    email: "",
    birthDate: "",
  });
  const [agreeEmail, setAgreeEmail] = useState(true);
  const [agreeSms, setAgreeSms] = useState(true);
  const [agreePush, setAgreePush] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState({
    grade: "MEMBER",
    rate: 1,
    totalSpend: 0,
    nextGrade: "SILVER",
    remainToNext: 50000,
    progress: 0,
  });

  useEffect(() => {
    getMe()
      .then((data) => {
        setValues({
          name: data.user.name || "",
          phone: data.user.phone || "",
          email: data.user.email || "",
          birthDate: data.user.birthDate || "",
        });
        setAgreeEmail(data.user.marketingEmail !== false);
        setAgreeSms(data.user.marketingSms !== false);
        setAgreePush(Boolean(data.user.marketingPush));
        if (data.user.membership) {
          setGrade(data.user.membership);
        }
      })
      .catch((err) => setError(err.message));
  }, [setValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await updateMe({
        name: values.name,
        phone: values.phone,
        birthDate: values.birthDate,
        marketingEmail: agreeEmail,
        marketingSms: agreeSms,
        marketingPush: agreePush,
      });
      updateUser(data.user);
      if (data.user.membership) setGrade(data.user.membership);
      setMessage("정보가 저장되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-layout">
      <div>
        <h1>회원 정보</h1>
        <form className="checkout-card" onSubmit={handleSubmit}>
          <h2>기본 정보</h2>
          <div className="form-grid-2">
            <Field label="이름">
              <Input name="name" value={values.name} onChange={handleChange} />
            </Field>
            <Field label="생년월일">
              <Input
                name="birthDate"
                value={values.birthDate}
                onChange={handleChange}
                placeholder="YYYY.MM.DD"
              />
            </Field>
          </div>
          <Field label="이메일">
            <Input value={values.email} disabled />
          </Field>
          <Field label="휴대폰">
            <Input name="phone" value={values.phone} onChange={handleChange} />
          </Field>
          <div className="agree-list">
            <Checkbox
              label="이메일 수신"
              checked={agreeEmail}
              onChange={(e) => setAgreeEmail(e.target.checked)}
            />
            <Checkbox
              label="SMS 수신"
              checked={agreeSms}
              onChange={(e) => setAgreeSms(e.target.checked)}
            />
            <Checkbox
              label="앱 푸시 알림"
              checked={agreePush}
              onChange={(e) => setAgreePush(e.target.checked)}
            />
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          {message ? <p className="auth-success">{message}</p> : null}
          <div className="ui-dev-row">
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
            <Button type="button" variant="secondary">
              비밀번호 변경
            </Button>
          </div>
        </form>
      </div>

      <aside className="profile-side">
        <div className="checkout-card">
          <h3>회원 등급</h3>
          <p className="grade-title">{grade.grade}</p>
          <div className="grade-bar">
            <span style={{ width: `${grade.progress}%` }} />
          </div>
          <p className="muted-note">
            {grade.nextGrade
              ? `${grade.nextGrade}까지 ${Number(
                  grade.remainToNext || 0
                ).toLocaleString("ko-KR")}원 · 적립률 ${grade.rate}%`
              : `최고 등급 · 적립률 ${grade.rate}%`}
          </p>
          <p className="muted-note">
            누적 구매 {Number(grade.totalSpend || 0).toLocaleString("ko-KR")}원
          </p>
        </div>
        <div className="checkout-card">
          <h3>배송지 관리</h3>
          <p className="muted-note">주문 시 입력한 배송지를 사용합니다.</p>
          <Button variant="secondary" block type="button" disabled>
            배송지 편집 (준비 중)
          </Button>
        </div>
        <button type="button" className="ui-btn ui-btn-text" onClick={logout}>
          로그아웃
        </button>
      </aside>
    </section>
  );
}

export default MyProfile;
