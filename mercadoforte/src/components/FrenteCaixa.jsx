import React, { useState, useRef, useEffect } from 'react';
import '../styles/FrenteCaixa.css';
import { collection, query, where, getDocs, addDoc, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from './LoadingSpinner';
import LoadingSale from './LoadingSale';
import { useNavigate } from 'react-router-dom';

const FrenteCaixa = ({ shoppingList, setShoppingList }) => {
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
  const [paid, setPaid] = useState(0)
  const [pixPaid, setPixPaid] = useState(0)
  const [noPaid, setNoPaid] = useState(0)
  const [insertedValue, setInsertedValue] = useState(0)
  const [noPaidModal, setNoPaidModal] = useState(false)
  const [changeValue, setChangeValue] = useState(0)
  const [changeValueModal, setChangeValueModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeUser, setActiveUser] = useState('')
  const empresaId = localStorage.getItem('empresaId');
  const [companyName, setCompanyName] = useState('')
  const [clientSection, setClienteSection] = useState(true)
  const [paymentMethodSection, setPaymentMethodSection] = useState(false)
  const [paymentAmountSection, setPaymentAmountSection] = useState(false)
  const endOfListRef = useRef(null);
  const [cashPayment, setCashPayment] = useState(false)
  const [pixPayment, setPixPayment] = useState(false)

  const Navigate = useNavigate()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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

  const cancelList = () => {
    setShoppingList([]);          // Limpa a lista de compras
    setExtraAmount(0);            // Reseta o valor extra
    setDiscountAmount(0);         // Reseta o desconto fixo
    setDiscount(0);               // Reseta o desconto percentual
    setSearchTerm('');            // Limpa o campo de busca
    setSearchResults([]);         // Limpa os resultados de busca
  };


  const applyDiscount = (e) => {
    const percentage = parseFloat(e.target.value) / 100;
    setDiscount(percentage);
  };

  const calculateTotal = () => {
    const subtotal = shoppingList.reduce(
      (total, product) => total + parseFloat(product.preco) * product.quantity,
      0
    );

    const totalWithExtras = subtotal + extraAmount;
    const totalAfterFixedDiscount = totalWithExtras - discountAmount;
    const finalTotal = totalAfterFixedDiscount - totalAfterFixedDiscount * discount;

    return finalTotal.toFixed(2);
  };


  const saveShoppingButton = () => {
    setSaveShoppingContainer(true)
  }

  const closeShoppingContainer = () => {
    setSaveShoppingContainer(false)
  }

  const handleUser = () => {
    const localUser = localStorage.getItem('empresaId')
    setActiveUser(localUser)
  }

  useEffect(() => {
    handleUser()
  })

  const handlePaymentMethod = (e) => {
    setPaymentMethod(e.target.value)
  }

  const showPaymentMethod = () => {
    setClienteSection(false)
    setPaymentMethodSection(true)
  }

  const showPaymentAmount = () => {
    if (paymentMethod === 'Dinheiro') {
      setPaymentMethodSection(false)
      setPaymentAmountSection(true)
      setCashPayment(true)
      setPixPayment(false)
    } else if (paymentMethod === 'Pix') {
      setPaymentMethodSection(false)
      setPaymentAmountSection(true)
      setCashPayment(false)
      setPixPayment(true)
    } else if (paymentMethod === 'DinheiroPix') {
      setPaymentMethodSection(false)
      setPaymentAmountSection(true)
      setCashPayment(true)
      setPixPayment(true)
    }

  }

  const backPaymentMethod = () => {
    setClienteSection(true)
    setPaymentMethodSection(false)
  }

  const backPaymentAmount = () => {
    setPaymentMethodSection(true)
    setPaymentAmountSection(false)
  }

  const saveShopping = async (e) => {
    e.preventDefault();
    setLoading(true)

    try {

      const empresaId = localStorage.getItem('empresaId'); // Supondo que já esteja salvo no localStorage

      if (!empresaId) {
        console.error("Nenhuma empresa logada.");
        setLoading(false);
        return;

      }
      const clientesRef = collection(db, `Empresas/${empresaId}/Clientes`);

      // Verifica se o cliente já existe
      const q = query(clientesRef, where('nome', '==', clientName));
      const querySnapshot = await getDocs(q);

      let clienteId = null;
      let currentDivida = 0; // Variável para armazenar o valor atual da dívida do cliente
      let totalGasto = 0;

      if (!querySnapshot.empty) {
        // Cliente encontrado, utiliza o ID existente e pega o valor da dívida
        querySnapshot.forEach((doc) => {
          clienteId = doc.id;
          currentDivida = doc.data().divida || 0; // Pegando a dívida atual, ou 0 se não existir
          totalGasto = doc.data().totalGasto || 0;
        });
      } else {
        // Cliente não encontrado, cria um novo
        clienteId = clientName; // Definir o ID como o nome do cliente
        await setDoc(doc(clientesRef, clienteId), {
          nome: clientName,
          nomeMinusculo: clientName.toLowerCase(),
          telefone: clientPhone,
          criadoEm: new Date(),
          divida: 0,
          totalGasto: 0,
          dataUltimoPagamento: '',
        });
      }

      // Atualiza a dívida somando o valor de Fiado
      const newDivida = currentDivida + parseFloat(noPaid);

      // Atualiza o cliente com o novo valor da dívida


      const finalTotal = calculateTotal();
      const PagoDinheiro = parseFloat(paid) || 0;
      const PagoPix = parseFloat(pixPaid) || 0;
      const PagoTotal = PagoDinheiro + PagoPix;


      const newTotalGasto = totalGasto + parseFloat(finalTotal);

      await setDoc(
        doc(clientesRef, clienteId),
        {
          divida: newDivida,
          totalGasto: newTotalGasto, // Atualiza total gasto
        },
        { merge: true }
      );

      const totalItems = shoppingList.reduce((total, product) => total + product.quantity, 0);

      // Adiciona a compra associando ao cliente
      await addDoc(collection(db, `Empresas/${empresaId}/Vendas`), {
        Lista: shoppingList,
        TotalVenda: parseFloat(finalTotal),
        TotalItens: totalItems,
        Cliente: {
          id: clienteId,
          nome: clientName,
          nomeMinusculo: clientName.toLowerCase(),
          telefone: clientPhone,
        },
        Operador: activeUser,
        Data: new Date(),
        PagoDinheiro: PagoDinheiro,
        PagoPix: PagoPix,
        PagoTotal: PagoTotal,
        Fiado: parseFloat(noPaid),
        FormaPagamento: paymentMethod,
      });


      // Atualiza o estoque dos produtos
      for (const product of shoppingList) {
        const productsRef = collection(db, `Empresas/${empresaId}/Produtos`);
        const productQuery = query(productsRef, where('nome', '==', product.nome));
        const productSnapshot = await getDocs(productQuery);

        if (!productSnapshot.empty) {
          const productDoc = productSnapshot.docs[0]; // Assume que o nome do produto é único
          const currentStock = productDoc.data().estoque || 0;

          // Atualiza o estoque no Firestore
          await setDoc(
            doc(productsRef, productDoc.id),
            {
              estoque: Math.max(0, currentStock - product.quantity), // Evita estoques negativos
            },
            { merge: true }
          );
        }
      }


      console.log('Venda salva com sucesso e estoque atualizado!');
      // Limpa os campos após salvar
      setClientName('');
      setClientPhone('');
      setShoppingList([]);
      setClientSuggestions([]); // Limpa sugestões
      setSaveShoppingContainer(false);
      setDiscount(0)
      setDiscountAmount(0)
      setExtraAmount(0)
      setPaid(0)
      setNoPaid(0)
      setChangeValue(0)
      setInsertedValue(0)
      setClienteSection(true)
      setPaymentMethodSection(false)
      setPaymentAmountSection(false)
    } catch (error) {
      console.error('Erro ao salvar a venda ou criar cliente:', error);
    } finally {
      setLoading(false); // Desativa o spinner após a operação
    }
  };



  // Função para buscar clientes pelo nome
  // Função para buscar clientes pelo nome
  const handleClientSearch = async (name) => {
    setClientName(name);
    if (name.trim() === '') {
      setClientSuggestions([]);
      return;
    }

    const lowerCaseName = name.toLowerCase(); // Converte o nome para letras minúsculas

    const clientesRef = collection(db, `Empresas/${empresaId}/Clientes`);
    const q = query(
      clientesRef,
      where('nomeMinusculo', '>=', lowerCaseName),
      where('nomeMinusculo', '<=', lowerCaseName + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);

    const suggestions = [];
    querySnapshot.forEach((doc) => {
      suggestions.push({ id: doc.id, ...doc.data() });
    });

    setClientSuggestions(suggestions);
  };


  // Seleciona cliente da lista de sugestões
  const selectClient = (client) => {
    setClientName(client.nome);
    setClientPhone(client.telefone);
    setClientSuggestions([]); // Limpa sugestões após seleção
  };


  const handlePaymentChange = (e, setValue, otherValue) => {
    let value = e.target.value;

    if (value === "") {
      setValue("");
      updateRemaining(
        setValue === setPaid ? "" : otherValue,
        setValue === setPixPaid ? "" : otherValue
      );
      return;
    }

    if (/^(\d+(\.\d{0,2})?|\.\d{0,2})$/.test(value)) {
      if (/^0[0-9]/.test(value)) {
        value = value.replace(/^0+/, '');
      }

      setValue(value);
      updateRemaining(
        setValue === setPaid ? value : otherValue,
        setValue === setPixPaid ? value : otherValue
      );
    }
  };


  const handlePixPaid = (e) => handlePaymentChange(e, setPixPaid);
  const handlePaid = (e) => handlePaymentChange(e, setPaid);


  useEffect(() => {
    if (insertedValue > paid || insertedValue > pixPaid) {
      setChangeValueModal(true)
    }

    if (noPaid > 0) {
      setNoPaidModal(true)
    } else {
      setNoPaidModal(false)
    }
  }, [])

  const handleInsertedValue = (e) => {
    let value = e.target.value;

    // Permitir que o campo fique vazio sem formatar imediatamente
    if (value === "") {
      setInsertedValue("");
      return;
    }

    // Permitir apenas números e um único ponto decimal com até duas casas decimais
    if (/^(\d+(\.\d{0,2})?|\.\d{0,2})$/.test(value)) {
      // Remove zeros à esquerda, exceto quando o valor é "0" ou começa com "0."
      if (/^0[0-9]/.test(value)) {
        value = value.replace(/^0+/, '');
      }

      setInsertedValue(value);
    }
  };


  const handleChangeValue = () => {
    if (insertedValue.length > 0) {
      setChangeValue(insertedValue - paid)
    }
  }

  useEffect(() => {
    handleChangeValue()
  })


  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (shoppingList.length > 0) {
        event.preventDefault();
        event.returnValue = ''; // Necessário para alguns navegadores mostrarem o alerta
      }
    };

    // Adiciona o ouvinte ao carregar o componente
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Remove o ouvinte ao desmontar o componente
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shoppingList]);


  const logoutUser = () => {
    localStorage.removeItem('empresaId')
    Navigate('/')
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

  const updateRemaining = (cash, pix) => {
    const total = calculateTotal();
    const cashValue = parseFloat(cash) || 0;
    const pixValue = parseFloat(pix) || 0;

    const remaining = total - (cashValue + pixValue);
    setNoPaid(remaining);
  };



  if (loading) {
    return (
      <LoadingSale />
    )
  }


  return (
    <div id="frenteCaixaContainer">
      {/**<span id='activeUser'>
        Operador: <strong>{activeUser}</strong>
        <span>
          <button className='material-symbols-outlined' onClick={logoutUser}>logout</button>
        </span>
      </span>**/}

      <span id='companyTag'>
        {companyName} <button id='logoutButton' className='material-symbols-outlined' onClick={logoutUser}>logout</button>
      </span>
      <main id="frenteCaixa">
        <section id="shoppingList" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          {shoppingList.map((product, index) => (
            <p className="product" key={index}>
              {product.nome} - {product.quantity} {product.nome === 'farinha' || product.nome === 'calabresa sadia kg' ? 'kg' : 'un'}
              <span>
                R${(product.preco * product.quantity).toFixed(2)}
                <button
                  className="remove-btn"
                  onClick={() => removeFromShoppingList(index)}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </span>
            </p>
          ))}
          <div ref={endOfListRef} />
        </section>
        <div id="secondContainer">
          <section id="searchBar">
            <input
              type="text"
              name="searchProduct"
              id="searchProduct"
              className="form-control"
              placeholder="Buscar produto por nome ou código"
              value={searchTerm}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
            <div id="searchResult">
              {searchResults.map((product, index) => (
                <p
                  key={index}
                  className="search-item"
                  onClick={() => handleResultClick(product)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{product.nome}</span>
                  {/*<span><img className='smallProductImage' src={product.imagem}/></span>
                   */}
                  <span>Cód: {product.codigo}</span>
                  <span>R${product.preco.toFixed(2)}</span>
                </p>
              ))}
            </div>
          </section>
          <section id="checkout">
            <div id="totalValue">
              <strong>
                <span>R${calculateTotal()}</span>
              </strong>
            </div>
            <div id='extraValues'>
              <input className='form-control'
                type="number"
                name="extraAmount"
                id="extraAmount"
                placeholder="Adicione valor extra"
                onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)}
              />
              <input className='form-control'
                type="number"
                name="discountAmount"
                id="discountAmount"
                placeholder="Adicionar desconto"
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
              <input className='form-control'
                type="number"
                name="discount"
                id="discount"
                placeholder="Adicionar desconto (%)"
                onChange={applyDiscount}
              />
            </div>
            <div id='checkoutButtons'>
              <button className="btn btn-success" onClick={saveShoppingButton} disabled={shoppingList.length === 0}>Pagamento</button>
              <button className="btn btn-danger" onClick={cancelList}>
                Cancelar
              </button>
            </div>
          </section>
        </div>
        {
          saveShoppingContainer && (
            <div id='background'>
              <div id='saveShoppingContainer'>
                <button id='closeShop' onClick={closeShoppingContainer} className='material-symbols-outlined'>close</button>
                {/**<div>
                  <h2>Venda a finalizar</h2>
                  <div id='listCheck'>
                    {
                      shoppingList.map((product, index) => (
                        <li key={index}>
                          {product.quantity}x {product.nome}
                        </li>
                      ))
                    }
                  </div>
                </div>**/}
                <div>
                  <h2>Dados do Cliente</h2>
                  <form onSubmit={saveShopping} id='clientData'>
                    {clientSection && (<div>
                      <label htmlFor="clientName">Nome do Cliente</label>
                      <input className='form-control'
                        type="text"
                        name="clientName"
                        id="clientName"
                        value={clientName}
                        onChange={(e) => handleClientSearch(e.target.value)} required
                      />
                      {clientSuggestions.length > 0 && (
                        <ul className="client-suggestions">
                          {clientSuggestions.map((client) => (
                            <li
                              key={client.id}
                              onClick={() => selectClient(client)}
                            >
                              {client.nome} - {client.telefone}
                            </li>
                          ))}
                        </ul>
                      )}
                      {clientSuggestions.length === 0 && (
                        <div>
                          <label htmlFor="clientPhone">Telefone do Cliente</label>
                          <input className='form-control'
                            type="text"
                            name="clientPhone"
                            id="clientPhone"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)} required
                          />
                        </div>
                      )}
                      <button type='button' onClick={showPaymentMethod} className='btn btn-dark buttonArrow' disabled={clientName.length === 0}><span className='material-symbols-outlined'>arrow_forward</span></button>
                    </div>)}




                    {paymentMethodSection && (<div>
                      <label htmlFor="paymentMethod">Qual a forma de pagamento?</label>
                      <select name="paymentMethod" id="paymentMethod" className='form-control' onChange={handlePaymentMethod} required value={paymentMethod}>
                        <optgroup>
                          <option value="" disabled>-- Selecione aqui --</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Pix">Pix</option>
                          <option value="Fiado">Fiado</option>
                          <option value="DinheiroPix">Dinheiro / Pix</option>
                        </optgroup>
                      </select>
                      <button type='button' onClick={showPaymentAmount} className='btn btn-dark buttonArrow' disabled={paymentMethod.length === 0}><span className='material-symbols-outlined'>arrow_forward</span></button>
                      <button type='button' onClick={backPaymentMethod} className='btn btn-secondary buttonArrowBack'><span className='material-symbols-outlined'>arrow_back_ios</span></button>
                    </div>

                    )}

                    {paymentAmountSection && (
                      <div>
                        {cashPayment && (
                            <div>
                              <label htmlFor="paid">Quanto o cliente vai pagar em dinheiro?</label>
                              <input
                                type="text"
                                value={paid || ""}
                                onChange={(e) => handlePaymentChange(e, setPaid, pixPaid)}
                              />
                            </div>
                          )
                        }
                        {pixPayment && (
                          <div>
                            <label htmlFor="pixPayment">Quanto o cliente vai pagar em PIX?</label>
                            <input
                              type="text"
                              value={pixPaid || ""}
                              onChange={(e) => handlePaymentChange(e, setPixPaid, paid)}
                            />
                          </div>
                        )}
                        <label htmlFor="insertedValue">Qual o valor inserido?</label>
                        <input type="number" name="insertedValue" id="insertedValue" className='form-control'
                          value={insertedValue} onChange={handleInsertedValue} disabled={paymentMethod.length === 0} />
                        <p className='changeValue' onChange={handleChangeValue}> <strong><i>O troco é de R${(changeValue.toFixed(2))}</i></strong></p>
                        <div>
                          <label htmlFor="noPaid">O fiado será:</label>
                          <input
                            type="text"
                            name="noPaid"
                            value={(parseFloat(noPaid) || 0).toFixed(2)
                            } readOnly
                            className="form-control"
                          />
                          <br />
                          <p id='calculateTotal'>Total: R${calculateTotal()}</p> <br />
                        </div>
                        <button className="btn btn-dark" type="submit" disabled={!(
                          parseFloat(paid) > 0 ||
                          parseFloat(pixPaid) > 0 ||
                          parseFloat(noPaid) > 0
                        )}>Finalizar Venda</button>
                        <button type='button' onClick={backPaymentAmount} className='btn btn-secondary buttonArrowBack'><span className='material-symbols-outlined'>arrow_back_ios</span></button>
                      </div>)}
                  </form>
                </div>
              </div>
            </div>
          )
        }
      </main>
    </div>
  );
};

export default FrenteCaixa;
