import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/Login.css';

const Login = () => {
    const navigate = useNavigate();

    const [inputPhone, setInputPhone] = useState('');
    const [inputPassword, setInputPassword] = useState('');
    const [loginError, setLoginError] = useState(false);

    useEffect(() => {
        const storedPhone = localStorage.getItem('empresaId');
        const storedPassword = localStorage.getItem('loginUserPassword');

        if (storedPhone && storedPassword) {
            navigate('/home');
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const docRef = doc(db, 'Empresas', inputPhone);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const companyData = docSnap.data();
                if (companyData.senha === inputPassword) {
                    localStorage.setItem('empresaId', inputPhone);
                    localStorage.setItem('loginUserPassword', inputPassword);
                    navigate('/home');
                } else {
                    setLoginError(true);
                }
            } else {
                setLoginError(true);
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            setLoginError(true);
        }
    };

    return (
        <main id='loginPage'>

            <form onSubmit={handleLogin}>
                <img id='loginImg' src={'/images/cart2.png'} alt="" />
                <h1>Mercado Forte</h1>
                <input
                    type="text"
                    className='form-control'
                    placeholder='Informe o telefone'
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                />
                <input
                    type="password"
                    className='form-control'
                    placeholder='Digite a senha'
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                />
                {loginError && <p className='error-message'>*Usuário ou senha inválido</p>}
                <button className='btn btn-dark form-control' type='submit'>Entrar</button>
                
                <Link to={'/criar-conta'}>Não tem uma conta? Crie agora</Link>
            </form>
            
        </main>
    );
};

export default Login;
