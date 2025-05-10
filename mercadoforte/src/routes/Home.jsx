import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FrenteCaixa from '../components/FrenteCaixa';
import CriarProduto from '../components/CriarProduto';
import EditarProdutos from '../components/EditarProdutos';
import Vendas from '../components/Vendas';
import Clientes from '../components/Clientes';
import Balanço from '../components/Balanço';
import EntradaDeNotas from '../components/EntradaDeNotas';
import Configuracoes from '../components/Configuracoes'; // Importar o componente Configuracoes

import '../styles/Home.css'; // Manter o CSS original por enquanto, será otimizado depois
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

// Mapeamento de seções para ícones
const menuItems = [
  { label: 'VENDER', section: 'FrenteCaixa', icon: 'point_of_sale' },
  { label: 'CRIAR PRODUTO', section: 'CriarProduto', icon: 'add_shopping_cart' },
  { label: 'EDITAR PRODUTOS', section: 'EditarProdutos', icon: 'edit_note' },
  { label: 'VENDAS FEITAS', section: 'Vendas', icon: 'receipt_long' },
  { label: 'CLIENTES', section: 'Clientes', icon: 'group' },
  { label: 'ENTRADA DE NOTAS', section: 'EntradaDeNotas', icon: 'inventory' },
  { label: 'BALANÇO', section: 'Balanço', icon: 'monitoring' },
  { label: 'CONFIGURAÇÕES', section: 'Configuracoes', icon: 'settings' }, // Adicionar item de menu para Configurações
];

export const Home = () => {
  const [activeSection, setActiveSection] = useState("FrenteCaixa");
  const [shoppingList, setShoppingList] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Controlar estado do menu
  const empresaId = localStorage.getItem("empresaId");
  const navigate = useNavigate(); // Hook para navegação
  const [scrolled, setScrolled] = useState(false)

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const fetchCompanyName = async () => {
      if (empresaId) {
        try {
          const empresaRef = doc(db, 'Empresas', empresaId);
          const empresaDoc = await getDoc(empresaRef);
          if (empresaDoc.exists()) {
            setCompanyName(empresaDoc.data().nome);
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

  // Removido logoutUser daqui, pois agora está dentro de Configuracoes
  // const logoutUser = () => {
  //   localStorage.removeItem('empresaId');
  //   navigate('/'); // Usar navigate para redirecionar
  // };

  const handleMenuItemClick = (section) => {
    setActiveSection(section);
    closeMenu(); // Fecha o menu ao selecionar um item
  };

  

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div id="home">
      <h1 id="logoTitle">
        <span id='logoImg'></span>
        Estoque Líder®
      </h1>
      <header>
        {/* Botão de menu só aparece em mobile (controlado via CSS) */}
        <button className='material-symbols-outlined' id='openMenu' onClick={openMenu}>menu</button>
        <h1 id='companyTitle' className={scrolled ? 'scrolled' : ''}>
            <span className="companyName">Estoque Líder 
            </span>
            <img src='/images/logoEstoqueLider.png' alt="logo" id='logoImg' />
          </h1>
      </header>
      {/* Nome da Empresa (Removido daqui, pode ser exibido dentro de Configurações ou em outro local) */}
      {/* 
      <span id='companyTag'>
        {companyName} <button id='logoutButton' className='material-symbols-outlined' onClick={logoutUser} title="Sair">logout</button>
      </span>
      */}
      
      <p id='logoSlogan'>Automações e Tecnologia <br />
      75 99105-7248</p>

      {/* Renderização Condicional das Seções */}
      <main id="main-content"> {/* Adiciona um container principal para o conteúdo */} 
        {activeSection === 'FrenteCaixa' && <FrenteCaixa shoppingList={shoppingList} setShoppingList={setShoppingList} />}
        {activeSection === 'CriarProduto' && <CriarProduto />}
        {activeSection === 'EditarProdutos' && <EditarProdutos />}
        {activeSection === 'Balanço' && <Balanço />}
        {activeSection === 'Vendas' && <Vendas />}
        {activeSection === 'Clientes' && <Clientes />}
        {activeSection === 'EntradaDeNotas' && <EntradaDeNotas />}
        {activeSection === 'Configuracoes' && <Configuracoes />} {/* Adicionar renderização condicional para Configurações */}
      </main>

      {/* Overlay do Menu (Mobile) */}
      <div id='backgroundMenu' className={isMenuOpen ? 'opened' : ''} onClick={closeMenu}></div>

      {/* Navegação (Menu Lateral Mobile / Barra Inferior Desktop) */}
      <nav id="menuNavigation" className={isMenuOpen ? 'active' : ''}>
        {menuItems.map(({ label, section, icon }) => (
          <button
            key={section}
            onClick={() => handleMenuItemClick(section)}
            className={`menu-item ${activeSection === section ? 'active' : ''}`}
            // Remove estilos inline, serão controlados pelo CSS
          >
            <span className="material-symbols-outlined menu-icon">{icon}</span>
            <span className="menu-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// Exportar o componente Home corretamente
export default Home;

