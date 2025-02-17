import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const CriarConta = () => {
    const [formData, setFormData] = useState({
        companyName: '',
        companyCategory: '',
        companyPhone: '',
        companyManager: '',
        companyPassword: '',
    });

    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generateKeywords = (name) => {
        return name.toLowerCase().match(/\w+('\w+)?/g) || [];
    };

    const createAccount = async (e) => {
        e.preventDefault();
        const { companyName, companyCategory, companyPhone, companyManager, companyPassword } = formData;
        const keywords = generateKeywords(companyName);

        try {
            await setDoc(doc(db, 'Empresas', companyPhone), {
                nome: companyName,
                nomeMinusculo: companyName.toLowerCase(),
                keywords,
                keywordsMinusculo: keywords.map((keyword) => keyword.toLowerCase()),
                categoria: companyCategory,
                telefone: companyPhone,
                gestor: companyManager,
                senha: companyPassword, // ⚠️ Alerta: Use Firebase Auth para senhas!
            });

            setFormData({
                companyName: '',
                companyCategory: '',
                companyPhone: '',
                companyManager: '',
                companyPassword: '',
            });

            setMessage('Conta criada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            setMessage(error.code === 'permission-denied' 
                ? 'Permissão insuficiente. Verifique as regras do Firestore.' 
                : 'Erro ao criar conta. Tente novamente.');
        }
    };

    return (
        <div>
            <h1>Criar Conta</h1>
            {message && <p>{message}</p>}
            <form onSubmit={createAccount}>
                <input type="text" name="companyName" className='form-control' placeholder='Nome da Empresa' value={formData.companyName} onChange={handleChange} />
                
                <select name="companyCategory" className='form-control' value={formData.companyCategory} onChange={handleChange}>
                    <option value="" disabled>Informe a Categoria</option>
                    <option value="Loja de Roupas">Loja de Roupas</option>
                    <option value="Minimercado">Minimercado</option>
                    <option value="Supermercado">Supermercado</option>
                </select>

                <input type="text" name="companyPhone" className='form-control' placeholder='Telefone da empresa' value={formData.companyPhone} onChange={handleChange} />
                <input type="text" name="companyManager" className='form-control' placeholder='Gestor da empresa' value={formData.companyManager} onChange={handleChange} />
                <input type="password" name="companyPassword" className='form-control' placeholder='Crie uma senha' value={formData.companyPassword} onChange={handleChange} />
                
                <button className='btn btn-dark' type='submit'>Criar Minha Conta</button>
            </form>
        </div>
    );
};

export default CriarConta;
