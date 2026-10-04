import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="centro">
      <div className="caixa-login">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="Bruno Milani" />
        <h1 className="titulo" style={{ textAlign: "center", fontSize: "1.6rem" }}>
          Meus sistemas
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
