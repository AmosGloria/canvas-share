import React from "react";
import { useState } from "react";
import { useAuth } from "../../hooks/authContext";

export default function Signup() {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e : React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "signup failed");
      login(data.user, data.token);
    } catch (err : unknown) {
      if(err instanceof Error)setError(err.message);
    }
  };
  return (
    <section>
      <h1>Welcome to Canvas Share</h1>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Enter your Name"
          value={form.name}
          onChange={handleChange}
        />
        <input
          name="email"
          type="email"
          placeholder="Enter your Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="password"
          type="text"
          placeholder="Enter your Password"
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">Signup</button>
      </form>
    </section>
  );
}
