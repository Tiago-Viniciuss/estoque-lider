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


  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const Navigate = useNavigate()

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
      const existingProductIndex = prevList.findIndex(item => item.nome === product.nome);

      if (existingProductIndex !== -1) {
        // Se o produto já estiver na lista, apenas aumenta a quantidade
        const updatedList = [...prevList];
        updatedList[existingProductIndex].quantity += quantity;
        return updatedList;
      } else {
        // Se o produto não estiver na lista, adiciona ele com a quantidade
        return [
          ...prevList,
          {
            nome: product.nome,
            preco: parseFloat(product.preco),
            quantity,
          },
        ];
      }
    });

    setSearchResults([]);  // Limpa os resultados da busca
    setSearchTerm('');     // Limpa o campo de pesquisa
    inputRef.current?.focus();  // Foca novamente no campo de busca

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
    window.location.reload();

  };


  const applyDiscount = (e) => {
    const percentage = parseFloat(e.target.value) / 100;
    setDiscount(percentage);
  };

  // Memoize calculateTotal to avoid unnecessary recalculations if possible
  // Or ensure its dependencies are stable
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

  // *** INÍCIO DA CORREÇÃO ***
  // useEffect para calcular automaticamente o valor de 'fiado' (noPaid)
  useEffect(() => {
    const totalCalculado = parseFloat(calculateTotal() || 0);
    // Use parseFloat para converter os valores dos inputs (que são strings) para números
    const valorPagoDinheiro = parseFloat(paid || 0);
    const valorPagoPix = parseFloat(pixPaid || 0);

    let valorFiado = totalCalculado - valorPagoDinheiro - valorPagoPix;

    // Garante que o valor fiado não seja negativo e trata possíveis NaN
    valorFiado = Math.max(0, valorFiado);
    // Garante que o fiado não seja maior que o total devido a erros de arredondamento ou lógica
    valorFiado = Math.min(totalCalculado, valorFiado);

    setNoPaid(valorFiado);

    // Dependências: recalcula sempre que os valores pagos ou o total da compra mudarem
  }, [paid, pixPaid, shoppingList, extraAmount, discountAmount, discount]);

  // Função ajustada para lidar com a entrada de valores de pagamento (Dinheiro e Pix)
  const handlePaymentChange = (e, setValue) => {
    let value = e.target.value;

    // Permite campo vazio
    if (value === "") {
      setValue("");
      return;
    }

    // Permite apenas números e um ponto decimal com até duas casas decimais
    // Regex melhorado para lidar com vários formatos de entrada numérica
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      // Converte "." para "0."
      if (value === '.') {
        value = '0.';
      }
      // Remove zeros à esquerda desnecessários (ex: "05" -> "5", mas mantém "0." ou "0")
      if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
        value = value.replace(/^0+/, '');
        // Se após remover zeros ficar vazio (ex: "00"), volta para "0"
        if (value === '') value = '0';
      }

      setValue(value);
    }
  };
  // *** FIM DA CORREÇÃO ***

  const saveShoppingButton = () => {
    setSaveShoppingContainer(true)
  }

  const closeShoppingContainer = () => {
    setSaveShoppingContainer(false)
  }

  const handleUser = () => {
    const localUser = localStorage.getItem('loginUserName')
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
    } else if (paymentMethod === 'Fiado') {
      setPaymentMethodSection(false)
      setPaymentAmountSection(true)
      // Quando for fiado, zerar os pagamentos?
      setPaid('');
      setPixPaid('');
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

      // Atualiza a dívida somando o valor de Fiado calculado pelo useEffect
      const newDivida = currentDivida + parseFloat(noPaid || 0); // Usa o noPaid do estado

      const finalTotal = parseFloat(calculateTotal() || 0);
      const PagoDinheiro = parseFloat(paid || 0);
      const PagoPix = parseFloat(pixPaid || 0);
      const PagoTotal = PagoDinheiro + PagoPix;

      const newTotalGasto = totalGasto + finalTotal;

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
        TotalVenda: finalTotal,
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
        Fiado: parseFloat(noPaid || 0), // Usa o noPaid do estado
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
      setPaid('') // Limpa como string
      setPixPaid('') // Limpa como string
      setNoPaid(0)
      setChangeValue(0)
      setInsertedValue('') // Limpa como string
      setClienteSection(true)
      setPaymentMethodSection(false)
      setPaymentAmountSection(false)
      setPaymentMethod('') // Limpa método de pagamento
      setCashPayment(false)
      setPixPayment(false)

    } catch (error) {
      console.error('Erro ao salvar a venda ou criar cliente:', error);
    } finally {
      setLoading(false); // Desativa o spinner após a operação
    }
  };



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


  // Removido handlePixPaid e handlePaid pois handlePaymentChange é usado diretamente

  // useEffect(() => {
  //   if (insertedValue > paid || insertedValue > pixPaid) {
  //     setChangeValueModal(true)
  //   }

  //   if (noPaid > 0) {
  //     setNoPaidModal(true)
  //   } else {
  //     setNoPaidModal(false)
  //   }
  // }, []) // Este useEffect original tinha uma dependência vazia, o que não parece correto.
  // Removido pois a lógica de modal pode precisar ser reavaliada.

  const handleInsertedValue = (e) => {
    let value = e.target.value;

    // Permitir que o campo fique vazio
    if (value === "") {
      setInsertedValue("");
      return;
    }

    // Regex para validar valor inserido (similar ao handlePaymentChange)
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      if (value === '.') {
        value = '0.';
      }
      if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
        value = value.replace(/^0+/, '');
        if (value === '') value = '0';
      }
      setInsertedValue(value);
    }
  };


  // useEffect para calcular o troco
  useEffect(() => {
    const valorInserido = parseFloat(insertedValue || 0);
    const valorPagoDinheiro = parseFloat(paid || 0);
    // O troco geralmente é calculado sobre o pagamento em dinheiro
    const troco = valorInserido - valorPagoDinheiro;
    setChangeValue(Math.max(0, troco)); // Troco não pode ser negativo
  }, [insertedValue, paid]);


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
    localStorage.removeItem('loginUserName')
    Navigate('/')
  }


  if (loading) {
    return (
      <LoadingSale />
    )
  }


  return (
    <div id="frenteCaixaContainer">
      {/*
      <span id='activeUser'>
        Operador: <strong>{activeUser}</strong>
        <span>
          <button className='material-symbols-outlined' onClick={logoutUser}>logout</button>
        </span>
      </span><span id='companyTag'>
        {companyName} <button id='logoutButton' className='material-symbols-outlined' onClick={logoutUser}>logout</button>
      </span>
      */}
      
      <main id="frenteCaixa">
        <section id="shoppingList" style={{ maxHeight: '550px', overflowY: 'auto' }}>
          {shoppingList.map((product, index) => (
            <p className="product" key={index}>
              {product.nome} - {product.quantity} {product.nome === 'Farinha' || product.nome === 'Calabresa Sadia kg' ? 'kg' : 'un'}
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
            <p id="totalValue">
              <strong>
                <span>R${calculateTotal()}</span>
              </strong>
            </p>
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
                            {/* *** CORREÇÃO INPUT *** */}
                            <input
                              type="text" // Mudar para text para melhor UX com decimais
                              className='form-control'
                              value={paid} // Usar o estado diretamente (string)
                              onChange={(e) => handlePaymentChange(e, setPaid)}
                              placeholder="0.00"
                            />
                          </div>
                        )
                        }
                        {pixPayment && (
                          <div>
                            <label htmlFor="pixPayment">Quanto o cliente vai pagar em PIX?</label>
                            {/* *** CORREÇÃO INPUT *** */}
                            <input
                              type="text" // Mudar para text
                              className='form-control'
                              value={pixPaid} // Usar o estado diretamente (string)
                              onChange={(e) => handlePaymentChange(e, setPixPaid)}
                              placeholder="0.00"
                            />
                          </div>
                        )}
                        {/* Campo 'Valor Inserido' e 'Troco' mantidos como estavam, mas agora usam a função de cálculo de troco via useEffect */}
                        {(cashPayment || paymentMethod === 'Dinheiro') && (
                          <>
                            <label htmlFor="insertedValue">Qual o valor inserido (Dinheiro)?</label>
                            <input type="text" name="insertedValue" id="insertedValue" className='form-control'
                              value={insertedValue} onChange={handleInsertedValue} placeholder="0.00" />
                            <p className='changeValue'> <strong><i>O troco é de R${(changeValue.toFixed(2))}</i></strong></p>
                          </>
                        )}
                        <div>
                          <label htmlFor="noPaid">O fiado será:</label>
                          {/* *** CORREÇÃO INPUT *** */}
                          <input
                            type="text" // Mudar para text
                            name="noPaid"
                            value={noPaid.toFixed(2)} // Formatar para exibição
                            readOnly // Manter readOnly
                            className="form-control"
                          />
                          <br />
                          <p id='calculateTotal'>Total: R${calculateTotal()}</p> <br />
                        </div>
                        {/* Lógica do botão Finalizar Venda ajustada para considerar o total */}
                        <button className="btn btn-dark" type="submit" disabled={loading || (parseFloat(paid || 0) + parseFloat(pixPaid || 0) + noPaid) < parseFloat(calculateTotal() || 0) - 0.001}>
                          {loading ? 'Finalizando...' : 'Finalizar Venda'}
                        </button>
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

