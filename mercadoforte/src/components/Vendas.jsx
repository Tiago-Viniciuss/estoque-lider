
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Substitua pelo caminho do seu arquivo de configuração do Firebase
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { jsPDF } from 'jspdf'; // Importando o jsPDF
import 'jspdf-autotable'; // Extensão para tabelas
import GraficoPizza from '../components/GraficoPizza.jsx';
import '../styles/Vendas.css'


const Vendas = ({ onTotalChange }) => {
    const [sales, setSales] = useState([]); // Lista de vendas
    const [filteredSales, setFilteredSales] = useState([]); // Lista de vendas filtradas
    const [filterName, setFilterName] = useState(''); // Nome do cliente para filtrar
    const [selectedSale, setSelectedSale] = useState(null); // Venda selecionada
    const [showModal, setShowModal] = useState(false); // Controla a exibição do modal
    const [loading, setLoading] = useState(false);
    const [salesValue, setSalesValue] = useState('')
    const [timeFilter, setTimeFilter] = useState(1); // Por padrão, dia atual
    const [fiadoValue, setFiadoValue] = useState(0); // Total de Fiado

    const [totalFiadoPix, setTotalFiadoPix] = useState(0);
    const [totalFiadoDinheiro, setTotalFiadoDinheiro] = useState(0);
    const [filterDate, setFilterDate] = useState('');
    const [year, month, day] = filterDate.split('-');
    const selectedDate = new Date(year, month - 1, day); // Corrige fuso (meses começam em 0)
    const empresaId = localStorage.getItem('empresaId');
    const [pixTotal, setPixTotal] = useState(0);
    const [dinheiroTotal, setDinheiroTotal] = useState(0);




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

    useEffect(() => {
        let filtered = sales;

        if (filterName.trim() !== '') {
            filtered = filtered.filter(sale =>
                sale.Cliente?.nome?.toLowerCase().includes(filterName.toLowerCase())
            );
        }


        if (filterDate) {
            const [year, month, day] = filterDate.split('-');
            const selectedDate = new Date(year, month - 1, day);

            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            filtered = filtered.filter(sale => {
                if (!sale.Data || typeof sale.Data.toDate !== 'function') return false;

                const saleTimestamp = sale.Data.toDate();
                return saleTimestamp >= startOfDay && saleTimestamp <= endOfDay;
            });
        }

        // Ordena por data/hora decrescente
        filtered.sort((a, b) => {
            const dateA = a.Data?.toDate?.();
            const dateB = b.Data?.toDate?.();
            if (!dateA || !dateB) return 0;
            return dateB - dateA;
        });

        setFilteredSales(filtered);
    }, [sales, filterName, filterDate]);



    useEffect(() => {
        const totalDinheiro = filteredSales.reduce((acc, sale) => {
            return acc + (parseFloat(sale.PagoDinheiro) || 0);
        }, 0);
        setDinheiroTotal(totalDinheiro);
    }, [filteredSales]);

    useEffect(() => {
        const totalPix = filteredSales.reduce((acc, sale) => {
            return acc + (parseFloat(sale.PagoPix) || 0);
        }, 0);
        setPixTotal(totalPix);
    }, [filteredSales]);



    const filterByDateRange = (days) => {
        const now = new Date();
        if (days === 1) {
            const startOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0, 0, 0, 0
            );
            const endOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
                0, 0, 0, 0
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
            filtered.sort((a, b) => {
                const dateA = a.Data?.toDate?.();
                const dateB = b.Data?.toDate?.();

                if (!dateA || !dateB) return 0;
                return dateB - dateA; // ordem decrescente
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
        doc.text('Minimercado Sagrada Família', 14, 10);

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


    // ---------------------------------------------------- //

    const [pagamentos, setPagamentos] = useState([]);
    const [filtro, setFiltro] = useState("hoje");
    const [dataEspecifica, setDataEspecifica] = useState("");

    useEffect(() => {
        const fetchPagamentos = async () => {
            const pagamentosRef = collection(db, `Empresas/${empresaId}/Pagamentos`);
            const now = new Date();
            let inicio;
            let fim = new Date();

            switch (filtro) {
                case "hoje":
                    inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "ontem":
                    inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7dias":
                    inicio = new Date(now);
                    inicio.setDate(inicio.getDate() - 7);
                    break;
                case "30dias":
                    inicio = new Date(now);
                    inicio.setDate(inicio.getDate() - 30);
                    break;
                case "data":
                    if (!dataEspecifica) return;
                    inicio = new Date(dataEspecifica);
                    fim = new Date(dataEspecifica);
                    fim.setDate(fim.getDate() + 1);
                    break;
                default:
                    return;
            }

            const q = query(
                pagamentosRef,
                where("data", ">=", Timestamp.fromDate(inicio)),
                where("data", "<", Timestamp.fromDate(fim))
            );

            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPagamentos(results);

            // 👉 Cálculo total geral
            const total = results.reduce((acc, pagamento) => acc + (Number(pagamento.valor) || 0), 0);
            if (onTotalChange) {
                onTotalChange(total);
            }

            // ✅ Cálculos por forma de pagamento
            const totalPix = results
                .filter(p => p.formaPagamento?.toLowerCase() === "pix")
                .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
            const totalDinheiro = results
                .filter(p => p.formaPagamento?.toLowerCase() === "dinheiro")
                .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

            setTotalFiadoPix(totalPix);
            setTotalFiadoDinheiro(totalDinheiro);
        };

        fetchPagamentos();
    }, [filtro, dataEspecifica, empresaId, onTotalChange]);



    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div id='vendas'>
            <section id='salesSection'>
                <h2>Vendas Feitas</h2>
                <div id='clientFilter'>
                    <label htmlFor="filterName">Filtrar por nome:</label>
                    <input className='form-control'
                        type="text"
                        id="filterSale"
                        value={filterName}
                        onChange={(e) => handleFilter(e.target.value)}
                        placeholder="Digite o nome do cliente"
                    />
                </div>
                <div id='dateFilter'>
                    <label htmlFor="timeFilter">Filtrar por perído:</label>
                    <select
                        id="timeFilter"
                        className="form-control"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(Number(e.target.value))}
                    >
                        <option value={1}>Hoje</option>
                        <option value={0}>Ontem</option>
                        <option value={7}>Últimos 7 dias</option>
                        <option value={15}>Últimos 15 dias</option>
                        <option value={30}>Últimos 30 dias</option>
                        <option value={60}>Últimos 02 meses</option>
                        <option value={90}>Últimos 03 meses</option>
                        <option value={180}>Últimos 06 meses</option>
                        <option value={365}>Últimos 12 meses</option>
                        <option value={9999}>Todos os tempos</option>
                    </select>
                </div>
                <div id='specificDateFilter'>
                    <label htmlFor="filterDate">Filtrar por data:</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)} className='form-control'
                    />
                </div>
                <ul>
                    {filteredSales.map((sale) => (
                        <li className='individualSale' key={sale.id} onClick={() => openSaleDetails(sale)}>
                            <span><strong>{sale.Cliente.nome}</strong>{' '}</span>
                            <span><strong>Valor: </strong>R${sale.TotalVenda.toFixed(2)}</span>
                            <span><strong>Data: </strong>{new Date(sale.Data.seconds * 1000).toLocaleString()} </span>
                            <span><strong><i>FP</i></strong>: {sale.FormaPagamento} </span>
                            <span><strong><i>ID</i></strong>: {sale.id} </span>
                        </li>
                    ))}
                </ul>
            </section>

            <div id='salesNumbers'>
                <p><strong>Pago:</strong> R${(Number(salesValue) - Number(fiadoValue)).toFixed(2).replace('.', ',')}</p>
                <p><strong>Fiado:</strong> R$ {fiadoValue.toFixed(2).replace('.', ',')}</p>
                <p><strong>Dinheiro:</strong> R${dinheiroTotal.toFixed(2)}</p>
                <p><strong>Pix:</strong> R$ {pixTotal.toFixed(2).replace('.', ',')}</p>
                <p><strong>Total de Vendas:</strong> R$ {Number(salesValue).toFixed(2).replace('.', ',')}</p>


            </div>

            {/* Modal com detalhes da venda */}
            {showModal && selectedSale && (
                <div id='modal' onClick={closeModal}>
                    <div id="modalContent">
                        <button id='closeModal' className="material-symbols-outlined" onClick={closeModal}>
                            close
                        </button>
                        <h2>Detalhes da Venda:</h2>
                        <p><strong>Operador:</strong>{selectedSale.Operador}</p>
                        <p><strong>Cliente:</strong> {selectedSale.Cliente.nome}</p>
                        <p><strong>Telefone:</strong> {selectedSale.Cliente.telefone}</p>
                        <p><strong>Data:</strong> {new Date(selectedSale.Data.seconds * 1000).toLocaleString()}</p>
                        <p><strong>Total:</strong> R${selectedSale.TotalVenda.toFixed(2)}</p>
                        <p><strong>Pago em Dinheiro:</strong> R${selectedSale.PagoDinheiro || ''}</p>
                        <p><strong>Pago em Pix:</strong> R${selectedSale.PagoPix || ''}</p>
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


            <div id='fiadoPaymentsSection'>
                <h2>Pagamentos de Fiado</h2>

                <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className='form-control'>
                    <option value="hoje">Hoje</option>
                    <option value="ontem">Ontem</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                    <option value="data">Por data específica</option>
                </select>

                {filtro === "data" && (
                    <input
                        type="date"
                        value={dataEspecifica}
                        onChange={(e) => setDataEspecifica(e.target.value)} className='form-control'
                    />
                )}

                <ul id='fiadoList'>
                    {pagamentos.map((p) => (
                        <li key={p.id} id='fiadoItem'>
                            <span className='fiadoDetails'><strong>{p.cliente}</strong></span> 
                            <span className='fiadoDetails'><strong>Valor:</strong> R$ {p.valor.toFixed(2)}</span>
                            <span className='fiadoDetails'><strong>Data:</strong>{p.data.toDate().toLocaleString("pt-BR")}</span>
                            <span className='fiadoDetails'><strong>FP:</strong>{p.formaPagamento}</span> {" "}
                            <span className='fiadoDetails'><strong>ID:</strong>{p.id}</span>
                        </li>
                    ))}
                    {pagamentos.length === 0 && <p>Nenhum pagamento encontrado.</p>}
                </ul>
                <div id='paymentDashboard'>
                    <h3>Pagamentos</h3>
                    <p><strong>Dinheiro:</strong> R$ {totalFiadoDinheiro.toFixed(2)}</p>
                    <p><strong>Pix:</strong> R$ {totalFiadoPix.toFixed(2)}</p>
                    <p><strong>Total: </strong>R${pagamentos.reduce((acc, pagamento) => acc + (Number(pagamento.valor) || 0), 0).toFixed(2)}</p>
                </div>

                <div>
                    <p id='caixaDia' title="Total Pago">
                        <strong>Caixa Pago:</strong> R$ {(
                            (Number(salesValue) - Number(fiadoValue)) +
                            pagamentos.reduce((acc, pagamento) => acc + (Number(pagamento.valor) || 0), 0)
                        ).toFixed(2).replace('.', ',')}
                    </p>

                </div>
            </div>
        </div>
    );
};

export default Vendas;
