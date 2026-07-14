import { useState } from 'react'
import React from 'react'
import { useAuth } from '../../hook/authContext'

export default function Login() {
    const {login} = useAuth();
    const [form, setForm] = useState({email:"", password:""});
    const [error, setError] = useState("");

    const HandleChange=(e : React.ChangeEvent<HTMLInputElement>)=>{
      setForm({...form, [e.target.name]: e.target.value})
    }

    const handleSubmit = async(e : React.SyntheticEvent<HTMLFormElement>)=>{
      e.preventDefault();
      setError("");
      try{
        const res = await fetch("http://localhost:5000/api/auth/login",{
          method : "POST",
          headers: {"Content-Type" : "application/json"},
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message || "Login failed");
        login(data.user, data.token)
      }
      catch(err : unknown){
        if(err instanceof Error) setError(err.message)
      }

    }
  return (
    <section>
        <h1>Welcome Back!</h1>
        {error && <p className='text-red-500'>{error}</p>}
        <form onSubmit={handleSubmit}>
            <input
            name='email'
            type='email'
            placeholder='Enter your Email'
            value={form.email}
            onChange={HandleChange}/>
            <input
            name='password'
            type='password'
            placeholder='Enter your Password'
            value={form.password}
            onChange={HandleChange}/>
            <button type='submit'>Login</button>
        </form>
    </section>
  )
}
