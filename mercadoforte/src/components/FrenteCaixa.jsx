import React, { useState, useRef, useEffect } from 'react';
import '../styles/FrenteCaixa.css'; // Manter estilos existentes
import '../styles/LoginModal.css'; // Adicionar estilos para o modal
import { collection, query, where, getDocs, addDoc, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore'; // Adicionado updateDoc
import { db } from '../firebaseConfig';
import LoadingSpinner from './LoadingSpinner'; // Assumindo que existe
import LoadingSale from './LoadingSale'; // Assumindo que existe

// --- Componente LoginModal (sem alterações na lógica principal) ---
const LoginModal = ({ onLoginSuccess, empresaId }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    if (!identifier || !password) {
      setError('Preencha o usuário/email e a senha.');
      setIsLoggingIn(false);
      return;
    }
    if (!empresaId) {
      setError('Erro interno: ID da empresa não encontrado.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const usersRef = collection(db, 'Empresas', empresaId, 'Usuarios');
      const emailQuery = query(usersRef, where('email', '==', identifier));
      const nameQuery = query(usersRef, where('nome', '==', identifier));

      const [emailSnapshot, nameSnapshot] = await Promise.all([getDocs(emailQuery), getDocs(nameQuery)]);

      let userDoc = null;
      if (!emailSnapshot.empty) {
        userDoc = emailSnapshot.docs[0];
      } else if (!nameSnapshot.empty) {
        userDoc = nameSnapshot.docs[0];
      }

      if (userDoc) {
        const userData = userDoc.data();
        // !!! ATENÇÃO: Comparação de senha em texto plano - INSEGURO !!!
        if (userData.password_placeholder === password) {
          onLoginSuccess(userData.nome);
        } else {
          setError('Senha incorreta.');
        }
      } else {
        setError('Usuário não encontrado.');
      }
    } catch (err) {
      console.error('Erro durante o login:', err);
      setError('Erro ao tentar fazer login. Verifique a conexão.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="modal-overlay login-modal-overlay">
      <div className="modal-content login-modal-content">
        <h2>Login do Operador</h2>
        <p>Por favor, faça login para acessar o caixa.</p>
        {error && <p className="feedback-message error">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="loginIdentifier">Usuário ou E-mail:</label>
            <input
              type="text"
              id="loginIdentifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="loginPassword">Senha:</label>
            <input
              type="password"
              id="loginPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={isLoggingIn}>
              {isLoggingIn ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        <p className="security-warning"><b>Atenção:</b> O sistema de login atual é simplificado e não seguro para produção.</p>
      </div>
    </div>
  );
};

// --- Componente FrenteCaixa ---
const FrenteCaixa = ({ shoppingList, setShoppingList }) => {
  // Estados existentes...
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);
  const [discount, setDiscount] = useState(0);
  const [extraAmount, setExtraAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saveShoppingContainer, setSaveShoppingContainer] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [paid, setPaid] = useState('') // Valor a ser PAGO em dinheiro (parte da compra)
  const [pixPaid, setPixPaid] = useState('') // Valor pago em Pix
  const [insertedValue, setInsertedValue] = useState(''); // <<< NOVO: Valor FÍSICO inserido em dinheiro
  const [noPaid, setNoPaid] = useState(0) // Valor fiado
  const [changeDue, setChangeDue] = useState(0); // Troco calculado
  const [paymentMethod, setPaymentMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeUser, setActiveUser] = useState(null);
  const empresaId = localStorage.getItem('empresaId');
  const [clientSection, setClienteSection] = useState(true)
  const [paymentMethodSection, setPaymentMethodSection] = useState(false)
  const [paymentAmountSection, setPaymentAmountSection] = useState(false)
  const endOfListRef = useRef(null);
  const [cashPayment, setCashPayment] = useState(false)
  const [pixPayment, setPixPayment] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(true);

  // <<< Proteção contra recarregamento acidental >>>
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (shoppingList.length > 0) {
        const confirmationMessage = 'Você tem uma venda em andamento. Tem certeza que deseja sair?';
        event.preventDefault();
        event.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shoppingList]);

  // Verifica login ao montar
  useEffect(() => {
    const loggedInUser = localStorage.getItem('loginUserName');
    if (loggedInUser) {
      setActiveUser(loggedInUser);
      setShowLoginModal(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setShowLoginModal(true);
    }
  }, []);

  // <<< NOVO useEffect para Foco no Input de Busca >>>
  useEffect(() => {
    // Condições para focar:
    // 1. O usuário deve estar logado (activeUser existe).
    // 2. O modal de salvar venda NÃO deve estar aberto (!saveShoppingContainer).
    // 3. O modal de login NÃO deve estar aberto (!showLoginModal) - já coberto por activeUser.
    // 4. A referência ao input deve existir (inputRef.current).
    if (activeUser && !saveShoppingContainer && inputRef.current) {
      // Pequeno delay para garantir que o DOM esteja pronto após navegação/renderização
      const timer = setTimeout(() => {
        inputRef.current.focus();
      }, 100); // 100ms de delay, ajuste se necessário

      // Limpa o timer se o componente desmontar ou as dependências mudarem antes do delay
      return () => clearTimeout(timer);
    }
  }, [activeUser, saveShoppingContainer]); // Dependências: Roda quando o usuário loga/desloga ou o modal de salvar abre/fecha


  const handleLoginSuccess = (userName) => {
    localStorage.setItem('loginUserName', userName);
    setActiveUser(userName);
    setShowLoginModal(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleLogout = () => {
    if (shoppingList.length > 0) {
      if (!window.confirm('Há uma venda em andamento. Deseja realmente sair e cancelar a venda atual?')) {
        return;
      }
    }
    localStorage.removeItem('loginUserName');
    setActiveUser(null);
    setShowLoginModal(true);
    // Resetar estados
    cancelList(true); // Passa true para forçar o reset sem confirmação adicional
  };

  // --- Funções de busca e carrinho (sem alterações significativas) ---
  const handleSearch = async (e) => {
    let term = e.target.value.trim().toLowerCase();
    setSearchTerm(term);

    if (term === '') {
      setSearchResults([]);
      return;
    }

    const match = term.match(/^(\d+(\.\d+)?)\*\s*(.+)$/);
    let quantity = 1;

    if (match) {
      quantity = parseFloat(match[1]);
      term = match[3].toLowerCase();
    }

    try {
      const productsRef = collection(db, `Empresas/${empresaId}/Produtos`);
      const codeQuery = query(productsRef, where('codigo', '==', term));

      const codeDocs = await getDocs(codeQuery);

      if (!codeDocs.empty) {
        // Se o código for encontrado, adiciona o produto automaticamente
        const productDoc = codeDocs.docs[0];
        const product = { ...productDoc.data(), quantity };
        addToShoppingList(product, product.quantity || 1);

        // Limpa o campo de busca e os resultados após adicionar
        setSearchTerm('');
        setSearchResults([]);
        inputRef.current?.focus();
        return; // Finaliza a função para evitar buscas adicionais
      }

      // Caso o código não seja encontrado, continua a busca por nome ou keywords
      const nameQuery = query(productsRef, where('nome', '>=', term), where('nome', '<=', term + '\uf8ff'));
      const keywordQuery = query(productsRef, where('keywords', 'array-contains', term));

      const nameDocs = await getDocs(nameQuery);
      const keywordDocs = await getDocs(keywordQuery);

      const results = [];
      nameDocs.forEach((doc) => results.push(doc.data()));
      keywordDocs.forEach((doc) => results.push(doc.data()));

      const formattedResults = results.map((result) => ({ ...result, quantity }));
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      const product = searchResults[0];
      addToShoppingList(product, product.quantity || 1);
    }
  };

  const handleResultClick = (product) => {
    // Verifica se o termo de busca tem multiplicador (ex: "0.85*produto")
    const match = searchTerm.match(/^([\d.]+)\*/);
    const quantity = match ? parseFloat(match[1]) : 1;

    // Adiciona o produto ao carrinho, desde que a quantidade seja válida
    if (quantity > 0) {
      addToShoppingList(product, quantity);
    } else {
      console.error("Quantidade inválida!");
    }

    // Limpa o campo de busca e resultados
    setSearchResults([]);
    setSearchTerm('');
    inputRef.current?.focus();
  };


  const addToShoppingList = (product, quantity = 1) => {
    setShoppingList((prevList) => {
      return prevList.map((item) =>
        item.nome === product.nome
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ).concat(prevList.some((item) => item.nome === product.nome) ? [] : [{
        nome: product.nome,
        preco: parseFloat(product.preco),
        quantity,
      }]);
    });

    setSearchResults([]);
    setSearchTerm('');
    inputRef.current?.focus();
  };



  useEffect(() => {
    endOfListRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [shoppingList]);

  const removeFromShoppingList = (indexToRemove) => {
    setShoppingList((prevList) => prevList.filter((_, index) => index !== indexToRemove));
  };

  // Função cancelList modificada para aceitar um parâmetro 'force'
  const cancelList = (force = false) => {
    if (!force && shoppingList.length > 0) {
      if (!window.confirm('Tem certeza que deseja cancelar a venda atual? Todos os itens serão removidos.')) {
        return;
      }
    }
    setShoppingList([]);
    setExtraAmount(0);
    setDiscountAmount(0);
    setDiscount(0);
    setSearchTerm('');
    setSearchResults([]);
    setClientName('');
    setClientPhone('');
    setClientSuggestions([]);
    setPaid('');
    setPixPaid('');
    setInsertedValue(''); // <<< RESETAR VALOR INSERIDO
    setNoPaid(0);
    setChangeDue(0);
    setPaymentMethod('');
    setClienteSection(true);
    setPaymentMethodSection(false);
    setPaymentAmountSection(false);
    setCashPayment(false);
    setPixPayment(false);
    setSaveShoppingContainer(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const applyDiscount = (e) => {
    const percentage = Math.max(0, parseFloat(e.target.value) || 0) / 100;
    setDiscount(percentage);
  };

  const calculateTotal = () => {
    const subtotal = shoppingList.reduce(
      (total, product) => total + parseFloat(product.preco || 0) * product.quantity,
      0
    );
    const totalWithExtras = subtotal + parseFloat(extraAmount || 0);
    const totalAfterFixedDiscount = totalWithExtras - parseFloat(discountAmount || 0);
    const finalTotal = totalAfterFixedDiscount * (1 - discount);
    return parseFloat(finalTotal.toFixed(2));
  };

  // <<< useEffect MODIFICADO para a NOVA LÓGICA de FIADO e TROCO >>>
  useEffect(() => {
    const totalCalculado = calculateTotal();
    const valorPagoDinheiro = parseFloat(paid || 0); // Quanto da compra será pago em dinheiro
    const valorPagoPix = parseFloat(pixPaid || 0);
    const valorInseridoDinheiro = parseFloat(insertedValue || 0); // Quanto dinheiro físico foi dado

    let valorFiado = 0;
    let troco = 0;

    // Calcula quanto falta pagar DEPOIS de aplicar o dinheiro e o pix erro
    const restanteAposPagamentos = totalCalculado - valorPagoDinheiro - valorPagoPix;

    if (restanteAposPagamentos > 0) {
      // Se ainda falta pagar, isso é o valor fiado
      valorFiado = restanteAposPagamentos;
    } else {
      // Se não falta pagar (ou foi pago a mais com pix/dinheiro), fiado é zero
      valorFiado = 0;
    }

    // Calcula o troco SOMENTE baseado no dinheiro físico inserido vs o que foi PAGO em dinheiro
    if (cashPayment && valorInseridoDinheiro > 0 && valorPagoDinheiro > 0) {
      if (valorInseridoDinheiro >= valorPagoDinheiro) {
        troco = valorInseridoDinheiro - valorPagoDinheiro;
      } else {
        // Se inseriu menos do que deveria pagar em dinheiro, não há troco.
        // Poderia adicionar um aviso aqui se desejado.
        troco = 0;
      }
    } else {
      // Se não é pagamento em dinheiro, ou não inseriu valor, ou não definiu valor a pagar em dinheiro, não há troco.
      troco = 0;
    }

    setNoPaid(parseFloat(valorFiado.toFixed(2)));
    setChangeDue(parseFloat(troco.toFixed(2)));

  }, [paid, pixPaid, insertedValue, cashPayment, shoppingList, extraAmount, discountAmount, discount]); // Adiciona insertedValue e cashPayment às dependências

  // Função genérica para inputs de pagamento
  const handlePaymentChange = (e, setValue) => {
    let value = e.target.value;
    if (value === "") {
      setValue("");
      return;
    }
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      if (value === '.') value = '0.';
      if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
        value = value.replace(/^0+/, '');
        if (value === '') value = '0';
      }
      setValue(value);
    }
  };

  // --- Funções de Navegação do Modal --- 
  const saveShoppingButton = () => {
    if (shoppingList.length === 0) {
      alert("Adicione produtos ao carrinho antes de salvar a venda.");
      return;
    }
    setClienteSection(true);
    setPaymentMethodSection(false);
    setPaymentAmountSection(false);
    setPaymentMethod('');
    setPaid('');
    setPixPaid('');
    setInsertedValue(''); // <<< RESETAR VALOR INSERIDO
    setClientName('');
    setClientPhone('');
    setClientSuggestions([]);
    setNoPaid(0);
    setChangeDue(0);
    setSaveShoppingContainer(true);
  }

  const closeShoppingContainer = () => {
    setSaveShoppingContainer(false)
  }

  const handlePaymentMethod = (e) => {
    setPaymentMethod(e.target.value)
  }

  const showPaymentMethod = () => {
    if (!clientName.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }
    setClienteSection(false)
    setPaymentMethodSection(true)
  }

  const showPaymentAmount = () => {
    if (!paymentMethod) {
      alert("Selecione uma forma de pagamento.");
      return;
    }
    setPaymentMethodSection(false)
    setPaymentAmountSection(true)
    const isCash = paymentMethod === 'Dinheiro' || paymentMethod === 'DinheiroPix';
    const isPix = paymentMethod === 'Pix' || paymentMethod === 'DinheiroPix';
    setCashPayment(isCash);
    setPixPayment(isPix);
    // Resetar valores ao mudar de seção ou método
    if (paymentMethod === 'Fiado') {
      setPaid('');
      setPixPaid('');
      setInsertedValue('');
    } else {
      // Se não for fiado, pode resetar ou pré-popular
      // Ex: pré-popular 'paid' com o total se for só dinheiro?
      // Por enquanto, apenas reseta o insertedValue
      setInsertedValue('');
    }
    setChangeDue(0); // Resetar troco ao entrar/mudar método
  }

  const backPaymentMethod = () => {
    setClienteSection(true)
    setPaymentMethodSection(false)
  }

  const backPaymentAmount = () => {
    setPaymentMethodSection(true)
    setPaymentAmountSection(false)
  }

  // --- Busca de Cliente --- 
  const handleClientSearch = async (name) => {
    setClientName(name);
    if (name.trim() === '') {
      setClientSuggestions([]);
      return;
    }
    const lowerCaseName = name.toLowerCase();
    const clientesRef = collection(db, `Empresas/${empresaId}/Clientes`);
    const q = query(
      clientesRef,
      where('nomeMinusculo', '>=', lowerCaseName),
      where('nomeMinusculo', '<=', lowerCaseName + '\uf8ff')
    );
    try {
      const querySnapshot = await getDocs(q);
      const suggestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientSuggestions(suggestions);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    }
  };

  const selectClient = (client) => {
    setClientName(client.nome);
    setClientPhone(client.telefone || '');
    setClientSuggestions([]);
  };

  // --- Função saveShopping MODIFICADA para NOVA LÓGICA de TROCO e VALIDAÇÕES --- 
  const saveShopping = async (e) => {
    e.preventDefault();
    if (!activeUser) {
      alert("Erro: Operador não identificado. Faça login novamente.");
      setShowLoginModal(true);
      return;
    }
    if (shoppingList.length === 0) {
      alert("Carrinho vazio. Adicione produtos antes de salvar.");
      return;
    }
    if (!clientName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }
    if (!paymentMethod) {
      alert("Selecione a forma de pagamento.");
      return;
    }

    const totalVenda = calculateTotal();
    const valorPagoDinheiro = parseFloat(paid || 0); // Quanto da compra PAGO em dinheiro
    const valorPagoPix = parseFloat(pixPaid || 0);
    const valorInseridoDinheiro = parseFloat(insertedValue || 0); // Dinheiro FÍSICO recebido
    const valorPagoTotalEfetivo = valorPagoDinheiro + valorPagoPix; // Quanto da compra foi coberto

    // Recalcula fiado e troco com base nos valores finais para garantir consistência
    let valorFiadoFinal = 0;
    let valorTrocoFinal = 0;

    const restanteAposPagamentos = totalVenda - valorPagoTotalEfetivo;
    if (restanteAposPagamentos > 0) {
      valorFiadoFinal = restanteAposPagamentos;
    }

    if (cashPayment && valorInseridoDinheiro > 0 && valorPagoDinheiro > 0) {
      if (valorInseridoDinheiro >= valorPagoDinheiro) {
        valorTrocoFinal = valorInseridoDinheiro - valorPagoDinheiro;
      } else {
        // Validação: Inseriu menos dinheiro do que o necessário para a parte em dinheiro
        alert(`Valor inserido (R$ ${valorInseridoDinheiro.toFixed(2)}) é menor que o valor a ser pago em dinheiro (R$ ${valorPagoDinheiro.toFixed(2)}).`);
        return;
      }
    } else if (cashPayment && valorPagoDinheiro > 0 && valorInseridoDinheiro <= 0) {
      // Validação: Precisa pagar em dinheiro mas não inseriu valor
      alert(`É necessário informar o valor inserido em dinheiro para cobrir os R$ ${valorPagoDinheiro.toFixed(2)}.`);
      return;
    }

    // Arredondamentos finais para evitar problemas de precisão
    valorFiadoFinal = parseFloat(valorFiadoFinal.toFixed(2));
    valorTrocoFinal = parseFloat(valorTrocoFinal.toFixed(2));

    // Validação: Troco e Fiado não podem coexistir
    /*if (valorTrocoFinal > 0 && valorFiadoFinal > 0) {
      alert(`Erro de lógica: Não pode haver troco (R$ ${valorTrocoFinal.toFixed(2)}) e valor fiado (R$ ${valorFiadoFinal.toFixed(2)}) ao mesmo tempo.`);
      return;
    }*/

    // Validação: Método Fiado não pode ter pagamento ou troco
    if (paymentMethod === 'Fiado' && (valorPagoTotalEfetivo > 0 || valorTrocoFinal > 0)) {
      alert("Para vendas Fiado, os valores pagos devem ser zero e não deve haver troco.");
      return;
    }

    

    setLoading(true);
    try {
      // --- Lógica de salvar cliente e venda (semelhante a antes) ---
      const clientesRef = collection(db, `Empresas/${empresaId}/Clientes`);
      const q = query(clientesRef, where('nome', '==', clientName.trim()));
      const querySnapshot = await getDocs(q);
      let clienteId = null;
      let currentDivida = 0;
      let totalGasto = 0;
      let clienteData = {};

      if (!querySnapshot.empty) {
        const clienteDoc = querySnapshot.docs[0];
        clienteId = clienteDoc.id;
        clienteData = clienteDoc.data();
        currentDivida = clienteData.divida || 0;
        totalGasto = clienteData.totalGasto || 0;
      } else {
        const newClienteData = {
          nome: clientName.trim(),
          nomeMinusculo: clientName.trim().toLowerCase(),
          telefone: clientPhone.trim(),
          criadoEm: new Date(),
          divida: 0,
          totalGasto: 0,
          dataUltimoPagamento: '',
        };
        const newClienteRef = await addDoc(clientesRef, newClienteData);
        clienteId = newClienteRef.id;
        clienteData = newClienteData;
        currentDivida = 0;
        totalGasto = 0;
      }

      const newDivida = currentDivida + valorFiadoFinal;
      const newTotalGasto = totalGasto + totalVenda;

      await updateDoc(doc(clientesRef, clienteId), {
        divida: newDivida,
        totalGasto: newTotalGasto,
        ...(clientPhone.trim() && clientPhone.trim() !== (clienteData.telefone || '') && { telefone: clientPhone.trim() }),
      });

      const totalItems = shoppingList.reduce((total, product) => total + product.quantity, 0);

      // Salva a venda com os valores corretos
      await addDoc(collection(db, `Empresas/${empresaId}/Vendas`), {
        Lista: shoppingList,
        TotalVenda: totalVenda,
        TotalItens: totalItems,
        Cliente: {
          id: clienteId,
          nome: clientName.trim(),
          nomeMinusculo: clientName.trim().toLowerCase(),
          telefone: clientPhone.trim(),
        },
        Operador: activeUser,
        Data: new Date(),
        PagoDinheiro: valorPagoDinheiro, // Quanto da VENDA foi pago em dinheiro
        PagoPix: valorPagoPix,
        PagoTotal: valorPagoTotalEfetivo, // Soma do que foi pago (dinheiro + pix)
        ValorInseridoDinheiro: cashPayment ? valorInseridoDinheiro : 0, // <<< Salva o valor inserido
        Fiado: valorFiadoFinal,
        Troco: valorTrocoFinal,
        FormaPagamento: paymentMethod,
      });

      // Atualiza o estoque
      for (const product of shoppingList) {
        const productsRef = collection(db, `Empresas/${empresaId}/Produtos`);
        const productQuery = query(productsRef, where('nome', '==', product.nome));
        const productSnapshot = await getDocs(productQuery);
        if (!productSnapshot.empty) {
          const productDoc = productSnapshot.docs[0];
          const currentStock = productDoc.data().estoque || 0;
          await updateDoc(doc(productsRef, productDoc.id), {
            estoque: Math.max(0, currentStock - product.quantity),
          });
        }
      }

      console.log('Venda salva com sucesso e estoque atualizado!');
      cancelList(true); // Força reset sem confirmação

    } catch (error) {
      console.error('Erro ao salvar a venda:', error);
      alert(`Erro ao salvar a venda: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <LoadingSale />
    )
  }

  // --- Renderização --- 
  return (
    <div id="frente-caixa-container">
      {showLoginModal && <LoginModal onLoginSuccess={handleLoginSuccess} empresaId={empresaId} />}

      {!showLoginModal && activeUser && (
        <>
          <div className="cashier-header">
            <span>Operador: <strong>{activeUser}</strong></span>
            <button onClick={handleLogout} className="btn-logout-cashier" title="Sair do Caixa">Sair</button>
          </div>
          <div className="shopping-list-container">

            <ul className="shopping-list">
              {shoppingList.map((product, index) => (
                <li key={index}>
                  <span>{product.nome} - {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}</span>
                  <span>R$ {(parseFloat(product.preco || 0) * product.quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromShoppingList(index)} className="remove-item-btn" disabled={saveShoppingContainer}>×</button>
                </li>
              ))}
              <div ref={endOfListRef} />
            </ul>

          </div>

          {/* Área de Busca e Lista de Compras (sem alterações visuais aqui) */}
          <section id='searchPaymentContainer'>
            <div className="search-container">
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por código ou nome"
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={handleKeyDown}
                className="search-input"
                disabled={saveShoppingContainer}
              />
              {searchResults.length > 0 && (
                <ul className="search-results">
                  {searchResults.map((product, index) => (
                    <li key={index} onClick={() => handleResultClick(product)}>
                      {product.nome} - R$ {parseFloat(product.preco).toFixed(2)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Controles e Total (sem alterações visuais aqui) */}
            <div className="controls-total-container">
              <div className="total-display">
                <h4>Total: R$ {calculateTotal().toFixed(2)}</h4>
              </div>
              <div className="action-buttons">
                <button onClick={saveShoppingButton} className="btn-save-sale" disabled={shoppingList.length === 0 || saveShoppingContainer}>
                  Salvar Venda
                </button>
                <button onClick={() => cancelList()} className="btn-cancel-sale" disabled={saveShoppingContainer}>
                  <span className='material-symbols-outlined'>close</span>
                </button>
              </div>
              <div className="controls">
                <div className="control-group">
                  <label>Desconto (%):</label>
                  <input type="number" min="0"  onChange={applyDiscount} disabled={saveShoppingContainer} />
                </div>
                <div className="control-group">
                  <label>Desconto (R$):</label>
                  <input type="number" min="0"  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} disabled={saveShoppingContainer} />
                </div>
                <div className="control-group">
                  <label>Acréscimo (R$):</label>
                  <input type="number" min="0" onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)} disabled={saveShoppingContainer} />
                </div>
              </div>
            </div>
          </section>

          {/* Modal de Salvamento da Venda (MODIFICADO) */}
          {saveShoppingContainer && (
            <div className="modal-overlay save-shopping-overlay">
              <div className="modal-content save-shopping-content">
                <button onClick={closeShoppingContainer} className="close-modal-btn" disabled={loading}>×</button>
                {loading && <LoadingSale />}

                {!loading && (
                  <form onSubmit={saveShopping}>
                    {/* Seção Cliente (sem alterações) */}
                    {clientSection && (
                      <div className="modal-section">
                        <h4>Dados do Cliente</h4>
                        <div className="form-group">
                          <label htmlFor="clientName">Nome:</label>
                          <input
                            type="text"
                            id="clientName"
                            value={clientName}
                            onChange={(e) => handleClientSearch(e.target.value)}
                            required
                          />
                          {clientSuggestions.length > 0 && (
                            <ul className="client-suggestions">
                              {clientSuggestions.map((client) => (
                                <li key={client.id} onClick={() => selectClient(client)}>
                                  {client.nome} {client.telefone ? `- ${client.telefone}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="clientPhone">Telefone:</label>
                          <input
                            type="text"
                            id="clientPhone"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                          />
                        </div>
                        <div className="modal-navigation">
                          <button type="button" onClick={showPaymentMethod} className="btn-next">Avançar</button>
                        </div>
                      </div>
                    )}

                    {/* Seção Forma de Pagamento (sem alterações) */}
                    {paymentMethodSection && (
                      <div className="modal-section">
                        <h4>Forma de Pagamento</h4>
                        <div className="form-group payment-methods">
                          <select value={paymentMethod} onChange={handlePaymentMethod} required>
                            <option value="" disabled>Selecione...</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Pix">Pix</option>
                            <option value="DinheiroPix">Dinheiro + Pix</option>
                            <option value="Fiado">Fiado</option>
                          </select>
                        </div>
                        <div className="modal-navigation">
                          <button type="button" onClick={backPaymentMethod} className="btn-back">Voltar</button>
                          <button type="button" onClick={showPaymentAmount} className="btn-next">Avançar</button>
                        </div>
                      </div>
                    )}

                    {/* Seção Valores Pagos (MODIFICADA) */}
                    {paymentAmountSection && (
                      <div className="modal-section">
                        <h4>Valores Pagos (Total: R$ {calculateTotal().toFixed(2)})</h4>

                        {/* Campo PAGO EM DINHEIRO (quanto da compra será coberto) */}
                        {cashPayment && (
                          <div className="form-group">
                            <label htmlFor="paidCash">Valor Pago em Dinheiro:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              id="paidCash"
                              value={paid}
                              onChange={(e) => handlePaymentChange(e, setPaid)}
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {/* <<< NOVO CAMPO: VALOR INSERIDO (dinheiro físico) >>> */}
                        {cashPayment && parseFloat(paid || 0) > 0 && ( // Só mostra se for pagar algo em dinheiro
                          <div className="form-group">
                            <label htmlFor="insertedValueCash">Valor Inserido (Dinheiro):</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              id="insertedValueCash"
                              value={insertedValue}
                              onChange={(e) => handlePaymentChange(e, setInsertedValue)}
                              placeholder="0.00"
                              required // Torna obrigatório se for pagar em dinheiro
                            />
                          </div>
                        )}

                        {changeDue > 0 && (
                          <div id="changeValue">
                            <p>O troco deve ser <strong>R$ {changeDue.toFixed(2)}</strong></p>
                          </div>
                        )}

                        {/* Campo PAGO EM PIX */}
                        {pixPayment && (
                          <div className="form-group">
                            <label htmlFor="paidPix">Valor Pago em Pix:</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              id="paidPix"
                              value={pixPaid}
                              onChange={(e) => handlePaymentChange(e, setPixPaid)}
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {/* Exibição de Fiado e Troco (baseado na nova lógica) */}
                        {noPaid > 0 && (
                          <div className="form-group read-only-group" style={{ color: 'orange', fontWeight: 'bold' }}>
                            <label>Valor Fiado:</label>
                            <span>R$ {noPaid.toFixed(2)}</span>
                          </div>
                        )}


                        {/* Navegação */}
                        <div className="modal-navigation">
                          <button type="button" onClick={backPaymentAmount} className="btn-back">Voltar</button>
                          <button type="submit" className="btn-save-final">Finalizar Venda</button>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FrenteCaixa;

