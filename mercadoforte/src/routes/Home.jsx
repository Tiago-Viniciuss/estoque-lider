import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FrenteCaixa from '../components/FrenteCaixa';
import CriarProduto from '../components/CriarProduto';
import EditarProdutos from '../components/EditarProdutos';
import '../styles/Home.css';
import Vendas from '../components/Vendas';
import Clientes from '../components/Clientes';
import Balanço from '../components/Balanço';
import EntradaDeNotas from '../components/EntradaDeNotas';

export const Home = () => {
  const [activeSection, setActiveSection] = useState('FrenteCaixa');

  // Estado compartilhado para a lista de compras
  const [shoppingList, setShoppingList] = useState([]);
  const [companyName, setCompanyName] = useState('')
  const empresaId = localStorage.getItem('empresaId');

  const openMenu = () => {
    const menu = document.getElementById('backgroundMenu')
    const nav = document.getElementById('menuNavigation')

    menu.classList.add('opened')
    nav.classList.add('active')
  }

  const closeMenu = () => {
    const menu = document.getElementById('backgroundMenu')
    const nav = document.getElementById('menuNavigation')

    menu.classList.remove('opened')
    nav.classList.remove('active')
  }

  useEffect(() => {
    const fetchCompanyName = async () => {
      if (empresaId) {
        try {
          // Se você está buscando na coleção 'Empresas' e não em 'Produtos', a referência deveria ser:
          const empresaRef = doc(db, 'Empresas', empresaId);  // Aqui está buscando diretamente pela empresa
          const empresaDoc = await getDoc(empresaRef);
  
          if (empresaDoc.exists()) {
            setCompanyName(empresaDoc.data().nome);  // Atualiza o nome da empresa
          } else {
            console.log('Empresa não encontrada');
          }
        } catch (error) {
          console.error('Erro ao buscar nome da empresa:', error);
        }
      }
    };
  
    fetchCompanyName();
  }, [empresaId]);

  const logoutUser = () => { 
    localStorage.removeItem('empresaId')
    Navigate('/')
  }

  return (
    <div id='home'>
      <h1 id='logoTitle'>
        <span id='logoImg'></span>
        Mercado Forte
      </h1>
      <header>
        <button className='material-symbols-outlined' id='openMenu' onClick={openMenu}>menu</button>
      </header>
      <span id='companyTag'>
        {companyName} <button id='logoutButton' className='material-symbols-outlined' onClick={logoutUser}>logout</button>
      </span>
      <p id='logoSlogan'>Automações e Tecnologia <br />
      75 99105-7248</p>
      {activeSection === 'FrenteCaixa' && <FrenteCaixa shoppingList={shoppingList} setShoppingList={setShoppingList} />}
      {activeSection === 'CriarProduto' && <CriarProduto />}
      {activeSection === 'EditarProdutos' && <EditarProdutos />}
      {activeSection === 'Balanço' && <Balanço />}
      {activeSection === 'Vendas' && <Vendas />}
      {activeSection === 'Clientes' && <Clientes />}
      {activeSection === 'EntradaDeNotas' && <EntradaDeNotas />}

      <div id='backgroundMenu' onClick={closeMenu}>
        <menu id="menuNavigation">
          {[
            { label: 'VENDER', section: 'FrenteCaixa' },
            { label: 'CRIAR PRODUTO', section: 'CriarProduto' }, { label: 'EDITAR PRODUTOS', section: 'EditarProdutos' },
            { label: 'VENDAS FEITAS', section: 'Vendas' },
            { label: 'CLIENTES', section: 'Clientes' }, { label: 'ENTRADA DE NOTAS', section: 'EntradaDeNotas' }, { label: 'BALANÇO', section: 'Balanço' },
          ].map(({ label, section }) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              style={{
                backgroundColor: activeSection === section ? 'black' : 'white',
                color: activeSection === section ? 'white' : 'black',
                border: '1px solid black',
                padding: '8px 8px',
                cursor: 'pointer',
                margin: '0 0px',
              }}
            >
              {label}
            </button>
          ))}
        </menu>
      </div>
    </div>
  );
};
