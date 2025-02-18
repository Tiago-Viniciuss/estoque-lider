import React, { useState } from 'react';
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

  return (
    <div id='home'>
      <h1 id='logoTitle'>
        <span id='logoImg'></span>
        Mercado Forte
      </h1>
      <p id='logoSlogan'>Automações e Tecnologia <br />
      75 99105-7248</p>
      {activeSection === 'FrenteCaixa' && <FrenteCaixa shoppingList={shoppingList} setShoppingList={setShoppingList} />}
      {activeSection === 'CriarProduto' && <CriarProduto />}
      {activeSection === 'EditarProdutos' && <EditarProdutos />}
      {activeSection === 'Balanço' && <Balanço />}
      {activeSection === 'Vendas' && <Vendas />}
      {activeSection === 'Clientes' && <Clientes />}
      {activeSection === 'EntradaDeNotas' && <EntradaDeNotas />}

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
  );
};
