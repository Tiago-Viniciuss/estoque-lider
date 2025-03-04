
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Substitua pelo caminho do seu arquivo de configuração do Firebase
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { jsPDF } from 'jspdf'; // Importando o jsPDF
import 'jspdf-autotable'; // Extensão para tabelas

import '../styles/Vendas.css'
import GraficoPizza from './GraficoPizza.jsx';

const Vendas = () => {
    const [sales, setSales] = useState([]); // Lista de vendas
    const [filteredSales, setFilteredSales] = useState([]); // Lista de vendas filtradas
    const [filterName, setFilterName] = useState(''); // Nome do cliente para filtrar
    const [selectedSale, setSelectedSale] = useState(null); // Venda selecionada
    const [showModal, setShowModal] = useState(false); // Controla a exibição do modal
    const [loading, setLoading] = useState(false);
    const [salesValue, setSalesValue] = useState('')
    const [timeFilter, setTimeFilter] = useState(1); // Por padrão, dia atual
    const [fiadoValue, setFiadoValue] = useState(0); // Total de Fiado
    const empresaId = localStorage.getItem('empresaId');

    // Função para buscar todas as vendas
    useEffect(() => {
        setLoading(true);
        const fetchSales = async () => {
            try {
                const salesRef = collection(db, `Empresas/${empresaId}/Vendas`);
                const querySnapshot = await getDocs(salesRef);
                const salesList = [];
                querySnapshot.forEach((doc) => {
                    salesList.push({ id: doc.id, ...doc.data() });
                });
                setSales(salesList);
                setFilteredSales(salesList);
                const totalSalesValue = salesList.reduce((acc, sale) => acc + sale.TotalVenda, 0);
                setSalesValue(totalSalesValue);

            } catch (error) {
                console.error('Erro ao buscar no Firestore:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, []);

    const filterByDateRange = (days) => {
        const now = new Date();
        if (days === 1) {
            const startOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                5, 0, 0
            );
            const endOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
                11, 0, 0
            );

            const filtered = sales.filter((sale) => {
                const saleDate = new Date(sale.Data.seconds * 1000);
                return saleDate >= startOfToday && saleDate < endOfToday;
            });
            setFilteredSales(filtered);
        } else if (days === 0) {
            // Filtro para ontem
            const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 5, 0, 0);
            const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);

            const filtered = sales.filter((sale) => {
                const saleDate = new Date(sale.Data.seconds * 1000);
                return saleDate >= startOfYesterday && saleDate < endOfYesterday;
            });
            setFilteredSales(filtered);
        } else {
            const filtered = sales.filter((sale) => {
                const saleDate = new Date(sale.Data.seconds * 1000);
                const diffTime = Math.abs(now - saleDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= days;
            });
            setFilteredSales(filtered);
        }
    };

    useEffect(() => {
        filterByDateRange(timeFilter);
    }, [timeFilter, sales]);

    useEffect(() => {
        const totalSalesValue = filteredSales.reduce((acc, sale) => acc + sale.TotalVenda, 0);
        setSalesValue(totalSalesValue);
    }, [filteredSales]);

    useEffect(() => {
        const totalFiadoValue = filteredSales.reduce((acc, sale) => acc + (sale.Fiado || 0), 0);

        setFiadoValue(totalFiadoValue);
    }, [filteredSales]);

    const handleFilter = (name) => {
        setFilterName(name);
        if (name.trim() === '') {
            setFilteredSales(sales);
        } else {
            const filtered = sales.filter((sale) =>
                sale.Cliente.nome.toLowerCase().includes(name.toLowerCase())
            );
            setFilteredSales(filtered);
        }
    };

    const openSaleDetails = (sale) => {
        setSelectedSale(sale);
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedSale(null);
        setShowModal(false);
    };

    const handleDeleteSale = async () => {
        if (selectedSale) {
            try {
                const saleDocRef = doc(db, `Empresas/${empresaId}/Vendas`, selectedSale.id);
                await deleteDoc(saleDocRef);
                setSales(sales.filter((sale) => sale.id !== selectedSale.id));
                setFilteredSales(filteredSales.filter((sale) => sale.id !== selectedSale.id));
                closeModal();
                alert('Venda excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir a venda:', error);
                alert('Erro ao excluir a venda!');
            }
        }
    };

    // Função para exportar venda selecionada como PDF
    const exportPDF = () => {
        if (!selectedSale) return;

        const doc = new jsPDF();
        doc.text('Mercearia Sagrada Família', 14, 10);

        doc.autoTable({
            head: [['Cliente', 'Telefone', 'Data', 'Total', 'Fiado', 'Operador']],
            body: [[
                selectedSale.Cliente.nome,
                selectedSale.Cliente.telefone,
                new Date(selectedSale.Data.seconds * 1000).toLocaleString(),
                `R$ ${selectedSale.TotalVenda}`,
                `R$ ${selectedSale.Fiado || 0}`,
                selectedSale.Operador
            ]]
        });

        selectedSale.Lista.forEach((item, i) => {
            doc.setFontSize(10);
            doc.text(`${item.quantity}x ${item.nome} - R$ ${item.preco.toFixed(2)}`, 14, 60 + i * 10);
        });

        doc.save(`Venda_${selectedSale.Cliente.nome}.pdf`);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div id='vendas'>
            <div id='clientFilter'>
                <label htmlFor="filterName">Filtrar por nome do cliente:</label>
                <input className='form-control'
                    type="text"
                    id="filterSale"
                    value={filterName}
                    onChange={(e) => handleFilter(e.target.value)}
                    placeholder="Digite o nome do cliente"
                />
            </div>
            <div id='dateFilter'>
                <label htmlFor="timeFilter">Filtrar por data das vendas:</label>
                <select
                    id="timeFilter"
                    className="form-control"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(Number(e.target.value))}
                >
                    <option value={1}>Hoje (após as 05h)</option>
                    <option value={0}>Ontem</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={15}>Últimos 15 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                </select>
            </div>
            <div id='salesNumbers'>
                <p><strong>Pago:</strong> R${(Number(salesValue) - Number(fiadoValue)).toFixed(2).replace('.', ',')}</p>
                <p><strong>Fiado:</strong> R$ {fiadoValue.toFixed(2).replace('.', ',')}</p>
                <p><strong>Total de Vendas:</strong> R$ {Number(salesValue).toFixed(2).replace('.', ',')}</p>
            </div>
            <ul>
                {filteredSales.map((sale) => (
                    <li className='individualSale' key={sale.id} onClick={() => openSaleDetails(sale)}>
                        <span><strong>{sale.Cliente.nome}</strong>{' '}</span>
                        <span><strong>R${sale.TotalVenda.toFixed(2)}</strong> </span>
                        <span><strong><i>ID</i></strong>: {sale.id} </span>
                    </li>
                ))}
            </ul>

            {/* Modal com detalhes da venda */}
            {showModal && selectedSale && (
                <div id='modal'>
                    <div id="modalContent">
                        <button id='closeModal' className="material-symbols-outlined" onClick={closeModal}>
                            close
                        </button>
                        <h2>Detalhes da Venda:</h2>
                        {/*<p><strong>Operador:</strong>{selectedSale.Operador}</p> */}
                        <p><strong>Cliente:</strong> {selectedSale.Cliente.nome}</p>
                        <p><strong>Telefone:</strong> {selectedSale.Cliente.telefone}</p>
                        <p><strong>Data:</strong> {new Date(selectedSale.Data.seconds * 1000).toLocaleString()}</p>
                        <p><strong>Total:</strong> R${selectedSale.TotalVenda.toFixed(2)}</p>
                        <p><strong>Pago:</strong> R${selectedSale.Pago || ''}</p>
                        <p><strong>Fiado:</strong> R${(selectedSale.Fiado.toFixed(2)) || ''}</p>
                        <p>
                            <strong>Forma de Pagamento:</strong> {
                                selectedSale.FormaPagamento
                            }
                        </p>
                        <h3>Itens da Venda:</h3>
                        <ul>
                            {selectedSale.Lista.map((item, index) => (
                                <li key={index}>{item.quantity} x {item.nome} - R${item.preco.toFixed(2)}</li>
                            ))}
                        </ul>
                        <div id='modalButtons'>
                            <button onClick={exportPDF} className="btn btn-primary">Exportar PDF</button>
                            <button className='btn btn-danger' onClick={handleDeleteSale}>
                                Deletar Venda
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div id='chart'>
                <GraficoPizza
                    vendasPagas={salesValue - fiadoValue}
                    vendasFiado={fiadoValue}
                    vendasTotais={salesValue}
                />
            </div>


        </div>
    );
};

export default Vendas;
