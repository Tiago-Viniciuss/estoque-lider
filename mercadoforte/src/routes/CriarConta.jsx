import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../styles/CriarConta.css'; // Estilização

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
    const {
      companyName,
      companyCategory,
      companyPhone,
      companyManager,
      companyPassword,
    } = formData;

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
        senha: companyPassword, // ⚠️ Use Firebase Auth para segurança real
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
      setMessage(
        error.code === 'permission-denied'
          ? 'Permissão insuficiente. Verifique as regras do Firestore.'
          : 'Erro ao criar conta. Tente novamente.'
      );
    }
  };

  return (
    <div id="createAccount">
      {message && <p>{message}</p>}

      <form onSubmit={createAccount}>
      <img id='loginImg' src={'/images/cart2.png'} alt="" />
      <h1>Mercado Forte</h1>
        <input
          type="text"
          name="companyName"
          className="form-control"
          placeholder="Nome da Empresa"
          value={formData.companyName}
          onChange={handleChange}
          required
        />

        <select
          name="companyCategory"
          className="form-control"
          value={formData.companyCategory}
          onChange={handleChange}
          required
        >
          <option value="" disabled>Informe a Categoria</option>
          <option value="Barbearia">Barbearia</option>
          <option value="Loja de Roupas">Loja de Roupas</option>
          <option value="Minimercado">Minimercado</option>
          <option value="Oficina">Oficina</option>
          <option value="Supermercado">Supermercado</option>
        </select>

        {/* Campo de Telefone */}
        <PhoneInput
          country="br"
          onlyCountries={['br']}
          preferredCountries={['br']}
          inputProps={{
            name: 'companyPhone',
            className: 'form-control phoneInput',
            required: true,
            id: 'companyPhone',
          }}
          value={formData.companyPhone}
          onChange={(value) => setFormData({ ...formData, companyPhone: value })}/>

        <input
          type="text"
          name="companyManager"
          className="form-control"
          placeholder="Gestor da empresa"
          value={formData.companyManager}
          onChange={handleChange}
        />

        <input
          type="password"
          name="companyPassword"
          className="form-control"
          placeholder="Crie uma senha"
          value={formData.companyPassword}
          onChange={handleChange}
        />

        <button className="btn btn-dark" type="submit">
          Criar Conta da Empresa
        </button>
      </form>
    </div>
  );
};

export default CriarConta;
