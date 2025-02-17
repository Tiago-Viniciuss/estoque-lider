import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/EntradaDeNotas.css';

const EntradaDeNotas = () => {
  const [billTitle, setBillTitle] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billValue, setBillValue] = useState('');
  const [message, setMessage] = useState('');
  const [showBills, setShowBills] = useState(false);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [filteredBills, setFilteredBills] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const empresaId = localStorage.getItem('empresaId');

  const saveBill = async (e) => {
    e.preventDefault();

    if (!billTitle || !billDate || !billValue) {
      setMessage('Por favor, preencha todos os campos.');
      return;
    }

    const newBill = {
      title: billTitle,
      date: billDate,
      value: parseFloat(billValue),
    };

    try {
      await addDoc(collection(db, `Empresas/${empresaId}/Despesas`), newBill);
      setMessage('Despesa registrada com sucesso!');
      setBillTitle('');
      setBillDate('');
      setBillValue('');
    } catch (error) {
      setMessage(`Erro ao registrar despesa: ${error.message}`);
    }
  };

  // Função para buscar todas as despesas
  const fetchBills = async () => {
    try {
      const billsSnapshot = await getDocs(collection(db, `Empresas/${empresaId}/Despesas`));
      const billsList = billsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBills(billsList);
      setFilteredBills(billsList); // Inicializa o filtro com todas as despesas
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    }
  };

  useEffect(() => {
    let filtered = bills;

    // Filtra por data específica, caso tenha sido selecionada
    if (filterDate) {
      filtered = filtered.filter((bill) => bill.date === filterDate);
    }

    // Filtra por mês e ano
    if (filterMonth && filterYear) {
      filtered = filtered.filter((bill) => {
        const billDate = new Date(bill.date);
        return billDate.getMonth() + 1 === parseInt(filterMonth) && billDate.getFullYear() === parseInt(filterYear);
      });
    }

    setFilteredBills(filtered);
  }, [filterDate, filterMonth, filterYear, bills]);

  // Função para calcular o valor total das despesas
  const calculateTotal = () => {
    return filteredBills.reduce((total, bill) => total + bill.value, 0).toFixed(2);
  };

  // Função para buscar detalhes de uma despesa específica
  const fetchBillDetails = async (id) => {
    try {
      const billDoc = await getDoc(doc(db, `Empresas/${empresaId}/Despesas`, id));
      if (billDoc.exists()) {
        setSelectedBill({ id: billDoc.id, ...billDoc.data() });
      } else {
        setMessage('Despesa não encontrada.');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da despesa:', error);
    }
  };

  // Mostrar ou ocultar a lista de despesas
  const toggleShowBills = () => {
    setShowBills((prev) => !prev);
    if (!showBills) fetchBills();
  };

  const closeBill = () => {
    setSelectedBill(null);
  };

  return (
    <div>
      {!showBills ? (
        <div>
          <h1>Registrar Despesa</h1>
          <form onSubmit={saveBill} className="saveBillForm">
            <input
              type="text"
              name="billTitle"
              id="billTitle"
              className="form-control"
              placeholder="Título da Despesa"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
            />
            <input
              type="date"
              name="billDate"
              id="billDate"
              className="form-control"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
            <input
              type="number"
              name="billValue"
              id="billValue"
              className="form-control"
              placeholder="Custo da Despesa"
              value={billValue}
              onChange={(e) => setBillValue(e.target.value)}
            />
            <button type="submit" className="btn btn-dark form-control">
              Registrar
            </button>
          </form>
          {message && <p>{message}</p>}
          <button id="showBills" className="btn btn-primary" onClick={toggleShowBills}>
            Minhas Despesas
          </button>
        </div>
      ) : (
        <div>
          <button className="btn btn-secondary" onClick={toggleShowBills}>
            Voltar
          </button>
          <h1>Lista de Despesas</h1>

          {/* Filtro por data */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="form-control"
          />

          {/* Filtro por mês */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="form-control"
          >
            <option value="">Selecione o mês</option>
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>

          {/* Filtro por ano */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="form-control"
          >
            <option value="">Selecione o ano</option>
            {new Array(5).fill(0).map((_, index) => {
              const year = new Date().getFullYear() - index;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
          <h3>Total: R${calculateTotal()}</h3>
          {filteredBills.length > 0 ? (
            <ul className="list-group">
              {filteredBills.map((bill) => (
                <li
                  key={bill.id}
                  className="list-group-item"
                  onClick={() => fetchBillDetails(bill.id)}
                >
                  {bill.title}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma despesa encontrada.</p>
          )}
          
        </div>
      )}

      {selectedBill && (
        <div className="bill-details-overlay">
          <div className="bill-details-container">
            <h2>Detalhes da Despesa</h2>
            <p><strong>Título:</strong> {selectedBill.title}</p>
            <p><strong>Data:</strong> {selectedBill.date}</p>
            <p><strong>Valor:</strong> R${selectedBill.value}</p>
            <button className="btn btn-danger" onClick={closeBill}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntradaDeNotas;
