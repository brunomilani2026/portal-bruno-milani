"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

export function LoginForm() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao}>
      <label htmlFor="senha">Senha</label>
      <input id="senha" name="senha" type="password" autoComplete="current-password" required autoFocus />
      {estado.erro && (
        <p className="erro" role="alert">
          {estado.erro}
        </p>
      )}
      <button className="btn-entrar" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
