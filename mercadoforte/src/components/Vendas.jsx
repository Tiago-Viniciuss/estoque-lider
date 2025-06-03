import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, where, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Substitua pelo caminho do seu arquivo de configuração do Firebase
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import GraficoPizza from '../components/GraficoPizza.jsx';
import '../styles/Vendas.css';

// Componente de Paginação reutilizável
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    if (totalPages <= 1) {
        return null; // Não mostra paginação se houver apenas uma página
    }

    return (
        <div className="pagination-controls" style={{ marginTop: '15px', textAlign: 'center' }}>
            <button onClick={handlePrevious} disabled={currentPage === 1} className="btn btn-sm btn-outline-secondary me-2">
                Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNext} disabled={currentPage === totalPages} className="btn btn-sm btn-outline-secondary ms-2">
                Próxima
            </button>
        </div>
    );
};


// Função auxiliar para obter o intervalo de datas com base no filtro
const getDateRange = (filter) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    switch (filter.type) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            break;
        case 'last7days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            break;
        case 'last15days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 0, 0, 0, 0);
            break;
        case 'last30days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
            break;
        case 'last60days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59, 0, 0, 0, 0);
            break;
        case 'last90days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
            break;
        case 'last180days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 179, 0, 0, 0, 0);
            break;
        case 'last365days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364, 0, 0, 0, 0);
            break;
        case 'specific':
            if (filter.specificDate) {
                const [year, month, day] = filter.specificDate.split('-');
                // Usar Date.UTC para criar as datas em Tempo Universal Coordenado
                startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                endDate = new Date(Date.UTC(year, month - 1, parseInt(day) + 1, 0, 0, 0, 0)); // Use parseInt(day) + 1 just in case
            } else {
                startDate = null;
                endDate = null;
            }
            break;

        case 'allTime':
        default:
            startDate = null;
            endDate = null;
            break;
    }

    const startTimestamp = startDate ? Timestamp.fromDate(startDate) : null;
    const endTimestamp = endDate ? Timestamp.fromDate(endDate) : null;

    const periodDescription = () => {
        if (filter.type === 'today') return `Hoje (${now.toLocaleDateString('pt-BR')})`;
        if (filter.type === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return `Ontem (${yesterday.toLocaleDateString('pt-BR')})`;
        }
        if (filter.type === 'specific' && filter.specificDate) {
            const [year, month, day] = filter.specificDate.split('-');
            const displayDate = new Date(Date.UTC(year, month - 1, day));
            return `Data Específica (${displayDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })})`;
        }
        if (filter.type === 'allTime') return 'Todo o Período';
        if (startDate && endDate) {
            const displayEndDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
            return `De ${startDate.toLocaleDateString('pt-BR')} a ${displayEndDate.toLocaleDateString('pt-BR')}`;
        }
        return 'Período Indefinido';
    };

    return { startTimestamp, endTimestamp, periodDescription: periodDescription() };
};

const ITEMS_PER_PAGE = 5;

const Vendas = ({ onTotalChange }) => {
    const [allSales, setAllSales] = useState([]);
    const [allPagamentos, setAllPagamentos] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [filteredPagamentos, setFilteredPagamentos] = useState([]); // Mantido para consistência, mas dados vêm de allPagamentos
    const [filterName, setFilterName] = useState('');
    const [dateFilter, setDateFilter] = useState({ type: 'today', specificDate: '' });
    const [selectedSale, setSelectedSale] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const empresaId = localStorage.getItem('empresaId');
    const [currentPeriodDescription, setCurrentPeriodDescription] = useState('');

    // Totais
    const [totalSalesValue, setTotalSalesValue] = useState(0);
    const [totalFiadoValue, setTotalFiadoValue] = useState(0);
    const [totalSalesDinheiro, setTotalSalesDinheiro] = useState(0);
    const [totalSalesPix, setTotalSalesPix] = useState(0);
    const [totalSalesCartao, setTotalSalesCartao] = useState(0);
    const [totalPagamentosDinheiro, setTotalPagamentosDinheiro] = useState(0);
    const [totalPagamentosPix, setTotalPagamentosPix] = useState(0);
    const [totalPagamentosCartao, setTotalPagamentosCartao] = useState(0);
    const [totalPagamentosGeral, setTotalPagamentosGeral] = useState(0);
    const [totalEmCaixa, setTotalEmCaixa] = useState(0);

    // KPIs
    const [profitMargin, setProfitMargin] = useState(30);
    const [estimatedProfit, setEstimatedProfit] = useState(0);
    const [fiadoPercentage, setFiadoPercentage] = useState(0);
    const [totalSalesCartaoDebito, setTotalSalesCartaoDebito] = useState(0);
    const [totalSalesCartaoCredito, setTotalSalesCartaoCredito] = useState(0);
    const [totalPagamentosCartaoDebito, setTotalPagamentosCartaoDebito] = useState(0); // Novo estado para pagamentos de fiado com cartão de débito

    // Paginação
    const [salesCurrentPage, setSalesCurrentPage] = useState(1);
    const [pagamentosCurrentPage, setPagamentosCurrentPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            if (!empresaId) return;
            setLoading(true);
            const { startTimestamp, endTimestamp, periodDescription } = getDateRange(dateFilter);
            setCurrentPeriodDescription(periodDescription);
            try {
                const salesRef = collection(db, `Empresas/${empresaId}/Vendas`);
                let salesQuery = query(salesRef, orderBy("Data", "desc"));
                if (startTimestamp) salesQuery = query(salesQuery, where("Data", ">=", startTimestamp));
                if (endTimestamp) salesQuery = query(salesQuery, where("Data", "<", endTimestamp));
                const salesSnapshot = await getDocs(salesQuery);
                const salesList = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllSales(salesList);

                const pagamentosRef = collection(db, `Empresas/${empresaId}/Pagamentos`);
                let pagamentosQuery = query(pagamentosRef, orderBy("data", "desc"));
                if (startTimestamp) pagamentosQuery = query(pagamentosQuery, where("data", ">=", startTimestamp));
                if (endTimestamp) pagamentosQuery = query(pagamentosQuery, where("data", "<", endTimestamp));
                const pagamentosSnapshot = await getDocs(pagamentosQuery);
                const pagamentosList = pagamentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllPagamentos(pagamentosList);
                setFilteredPagamentos(pagamentosList); // Atualiza ambos para consistência inicial

            } catch (error) {
                console.error('Erro ao buscar dados no Firestore:', error);
                setAllSales([]);
                setAllPagamentos([]);
                setFilteredPagamentos([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateFilter, empresaId]);

    // Filtro de nome para vendas (client-side)
    useEffect(() => {
        let nameFiltered = allSales;
        if (filterName.trim() !== '') {
            nameFiltered = nameFiltered.filter(sale =>
                sale.Cliente?.nome?.toLowerCase().includes(filterName.toLowerCase())
            );
        }
        setFilteredSales(nameFiltered);
        setSalesCurrentPage(1);
    }, [allSales, filterName]);

    // Cálculo de totais e KPIs de Vendas
    useEffect(() => {
        const totalVendas = filteredSales.reduce((acc, sale) => acc + (sale.TotalVenda || 0), 0);
        let currentTotalFiadoTradicional = 0;
        let currentTotalDinheiro = 0;
        let currentTotalPix = 0;
        let currentTotalSalesCartaoDebito = 0;
        let currentTotalSalesCartaoCredito = 0;

        for (const sale of filteredSales) {
            currentTotalDinheiro += parseFloat(sale.PagoDinheiro) || 0;
            currentTotalPix += parseFloat(sale.PagoPix) || 0;
            currentTotalFiadoTradicional += parseFloat(sale.Fiado) || 0;

            if (sale.TipoCartao === 'debito') {
                currentTotalSalesCartaoDebito += parseFloat(sale.PagoCartao) || 0;
            } else if (sale.TipoCartao === 'credito') {
                currentTotalSalesCartaoCredito += parseFloat(sale.PagoCartao) || 0;
            }
        }

        const novoTotalFiadoValue = currentTotalFiadoTradicional + currentTotalSalesCartaoCredito;

        setTotalSalesValue(totalVendas);
        setTotalFiadoValue(novoTotalFiadoValue); // Fiado tradicional + Cartão de Crédito
        setTotalSalesDinheiro(currentTotalDinheiro);
        setTotalSalesPix(currentTotalPix);
        setTotalSalesCartaoDebito(currentTotalSalesCartaoDebito); // Apenas Débito
        setTotalSalesCartaoCredito(currentTotalSalesCartaoCredito); // Apenas Crédito (para informação, se necessário)
        // O estado totalSalesCartao (geral) pode ser removido ou recalculado se ainda for necessário em outro lugar:
        // setTotalSalesCartao(currentTotalSalesCartaoDebito + currentTotalSalesCartaoCredito);

        const percentage = totalVendas > 0 ? (novoTotalFiadoValue / totalVendas) * 100 : 0;
        setFiadoPercentage(percentage);

    }, [filteredSales, setTotalSalesValue, setTotalFiadoValue, setTotalSalesDinheiro, setTotalSalesPix, setTotalSalesCartaoDebito, setTotalSalesCartaoCredito, setFiadoPercentage]);

    // Cálculo de totais de Pagamentos
    useEffect(() => {
        const totalGeral = allPagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
        const totalPixPg = allPagamentos
            .filter(p => p.formaPagamento?.toLowerCase() === "pix")
            .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
        const totalDinheiroPg = allPagamentos
            .filter(p => p.formaPagamento?.toLowerCase() === "dinheiro")
            .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

        // Total de pagamentos de fiado com cartão (geral: débito + crédito) - para fins informativos na seção pagamentosNumbers
        const totalCartaoPgGeral = allPagamentos
            .filter(p => p.formaPagamento && /cart[aã]o/i.test(p.formaPagamento))
            .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

        // Total de pagamentos de fiado especificamente com cartão de DÉBITO - para o caixa
        const totalCartaoDebitoPg = allPagamentos
            .filter(p =>
                p.formaPagamento &&
                /cart[aã]o/i.test(p.formaPagamento) &&
                p.tipoCartao?.toLowerCase() === "debito"
            )
            .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

        setTotalPagamentosGeral(totalGeral); // Soma de todos os pagamentos de fiado
        setTotalPagamentosPix(totalPixPg); // Pagamentos de fiado em Pix
        setTotalPagamentosDinheiro(totalDinheiroPg); // Pagamentos de fiado em Dinheiro
        setTotalPagamentosCartao(totalCartaoPgGeral); // Pagamentos de fiado com Cartão (Débito + Crédito)
        setTotalPagamentosCartaoDebito(totalCartaoDebitoPg); // Pagamentos de fiado com Cartão de Débito

        if (onTotalChange) {
            onTotalChange(totalGeral);
        }
        setPagamentosCurrentPage(1);
    }, [allPagamentos, onTotalChange]);

    // Cálculo Total em Caixa
    useEffect(() => {
        const calculatedTotalCaixa =
            totalSalesDinheiro +
            totalSalesPix +
            totalSalesCartaoDebito + // Vendas diretas em Débito
            totalPagamentosDinheiro + // Pagamentos de fiado em Dinheiro
            totalPagamentosPix + // Pagamentos de fiado em Pix
            totalPagamentosCartaoDebito; // Pagamentos de fiado em Cartão de Débito

        setTotalEmCaixa(calculatedTotalCaixa);
    }, [
        totalSalesDinheiro,
        totalSalesPix,
        totalSalesCartaoDebito,
        totalPagamentosDinheiro,
        totalPagamentosPix,
        totalPagamentosCartaoDebito // Adicionada dependência
    ]);



    // Cálculo Lucro Estimado
    useEffect(() => {
        const profit = totalSalesValue * (profitMargin / 100);
        setEstimatedProfit(profit);
    }, [totalSalesValue, profitMargin]);

    // Lógica para obter itens da página atual
    const currentSales = useMemo(() => {
        const firstPageIndex = (salesCurrentPage - 1) * ITEMS_PER_PAGE;
        const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE;
        return filteredSales.slice(firstPageIndex, lastPageIndex);
    }, [filteredSales, salesCurrentPage]);

    const currentPagamentos = useMemo(() => {
        const firstPageIndex = (pagamentosCurrentPage - 1) * ITEMS_PER_PAGE;
        const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE;
        return allPagamentos.slice(firstPageIndex, lastPageIndex);
    }, [allPagamentos, pagamentosCurrentPage]);

    // Calcula total de páginas
    const salesTotalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
    const pagamentosTotalPages = Math.ceil(allPagamentos.length / ITEMS_PER_PAGE);

    // Handlers
    const handleFilterNameChange = (e) => setFilterName(e.target.value);
    const handleDateFilterChange = (e) => {
        const newType = e.target.value;
        setDateFilter(prev => ({ ...prev, type: newType, specificDate: newType === 'specific' ? prev.specificDate : '' }));
        setSalesCurrentPage(1);
        setPagamentosCurrentPage(1);
    };
    const handleSpecificDateChange = (e) => {
        setDateFilter(prev => ({ ...prev, type: 'specific', specificDate: e.target.value }));
        setSalesCurrentPage(1);
        setPagamentosCurrentPage(1);
    };
    const openSaleDetails = (sale) => { setSelectedSale(sale); setShowModal(true); };
    const closeModal = () => { setSelectedSale(null); setShowModal(false); };
    const handleProfitMarginChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value) && value <= 100) {
            setProfitMargin(Number(value) || 0);
        }
    };

    const handleDeleteSale = async () => {
        if (selectedSale) {
            try {
                setLoading(true);
                const saleDocRef = doc(db, `Empresas/${empresaId}/Vendas`, selectedSale.id);
                await deleteDoc(saleDocRef);
                setAllSales(prev => prev.filter(sale => sale.id !== selectedSale.id));
                closeModal();
                alert('Venda excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir a venda:', error);
                alert('Erro ao excluir a venda!');
            } finally {
                setLoading(false);
            }
        }
    };

    // *** FUNÇÃO exportSalePDF IMPLEMENTADA ***
    const exportSalePDF = () => {
        if (!selectedSale) return;

        const doc = new jsPDF();
        const margin = 14;
        let currentY = 20;

        // Título
        doc.setFontSize(16);
        doc.text('Detalhes da Venda', margin, currentY);
        currentY += 10;

        // Dados Principais (usando autoTable para melhor formatação)
        doc.setFontSize(10);
        const saleDetailsHeader = [["Cliente", "Telefone", "Data", "Total", "Fiado", "Operador"]];
        const saleDetailsBody = [[
            selectedSale.Cliente?.nome || 'N/A',
            selectedSale.Cliente?.telefone || 'N/A',
            selectedSale.Data?.seconds ? new Date(selectedSale.Data.seconds * 1000).toLocaleString('pt-BR') : 'N/A',
            `R$ ${(selectedSale.TotalVenda || 0).toFixed(2).replace('.', ',')}`,
            `R$ ${(selectedSale.Fiado || 0).toFixed(2).replace('.', ',')}`,
            selectedSale.Operador || 'N/A'
        ]];

        doc.autoTable({
            head: saleDetailsHeader,
            body: saleDetailsBody,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [70, 70, 70] }, // Cor escura para cabeçalho
            styles: { fontSize: 9 }
        });
        currentY = doc.lastAutoTable.finalY + 10;

        // Pagamentos (Dinheiro/Pix)
        doc.text(`Pago em Dinheiro: R$ ${(selectedSale.PagoDinheiro || 0).toFixed(2).replace('.', ',')}`, margin, currentY);
        currentY += 7;
        doc.text(`Pago em Pix: R$ ${(selectedSale.PagoPix || 0).toFixed(2).replace('.', ',')}`, margin, currentY);
        currentY += 10;

        // Itens da Venda
        doc.setFontSize(12);
        doc.text("Itens:", margin, currentY);
        currentY += 7;
        doc.setFontSize(9);

        const itemsHeader = [["Qtd", "Nome", "Preço Unit.", "Total Item"]];
        const itemsBody = (selectedSale.Lista || []).map(item => [
            item.quantity,
            item.nome || 'N/A',
            `R$ ${(item.preco || 0).toFixed(2).replace('.', ',')}`,
            `R$ ${((item.quantity || 0) * (item.preco || 0)).toFixed(2).replace('.', ',')}`
        ]);

        doc.autoTable({
            head: itemsHeader,
            body: itemsBody,
            startY: currentY,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] }, // Verde para itens
            styles: { fontSize: 8 }
        });

        // Nome do Arquivo
        const filename = `Venda_${selectedSale.Cliente?.nome?.replace(/\s+/g, '_') || 'Cliente'}_${selectedSale.id.substring(0, 5)}.pdf`;
        doc.save(filename);
    };

    const exportReportPDF = () => {
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString('pt-BR');
        const pageTitle = `Relatório de Vendas e Pagamentos Fiado`;
        const periodText = `Período: ${currentPeriodDescription}`;
        const generatedDateText = `Gerado em: ${today}`;

        doc.setFontSize(18);
        doc.text(pageTitle, 14, 20);
        doc.setFontSize(10);
        doc.text(periodText, 14, 28);
        doc.text(generatedDateText, 14, 34);

        doc.setFontSize(12);
        doc.text("Resumo e KPIs", 14, 45);
        doc.setFontSize(10);
        const summaryText = [
            `KPIs:`,
            `  - Nº Vendas: ${filteredSales.length}`,
            `  - Nº Pagamentos Fiado: ${allPagamentos.length}`,
            `  - % Vendas Fiado: ${fiadoPercentage.toFixed(1)}%`,
            `  - Lucro Estimado (${profitMargin}%): R$ ${estimatedProfit.toFixed(2).replace('.', ',')}`,
            ` `,
            `Vendas:`,
            `  - Total Vendido: R$ ${totalSalesValue.toFixed(2).replace('.', ',')}`,
            `  - Total Fiado Gerado: R$ ${totalFiadoValue.toFixed(2).replace('.', ',')}`,
            `  - Recebido (Dinheiro): R$ ${totalSalesDinheiro.toFixed(2).replace('.', ',')}`,
            `  - Recebido (Pix): R$ ${totalSalesPix.toFixed(2).replace('.', ',')}`,
            `  - Recebido (Total Vendas): R$ ${(totalSalesDinheiro + totalSalesPix).toFixed(2).replace('.', ',')}`,
            `Pagamentos de Fiado:`,
            `  - Total Recebido: R$ ${totalPagamentosGeral.toFixed(2).replace('.', ',')}`,
            `  - Recebido (Dinheiro): R$ ${totalPagamentosDinheiro.toFixed(2).replace('.', ',')}`,
            `  - Recebido (Pix): R$ ${totalPagamentosPix.toFixed(2).replace('.', ',')}`,
            ` `,
            `>> TOTAL EM CAIXA (Vendas Din/Pix + Pag. Fiado): R$ ${totalEmCaixa.toFixed(2).replace('.', ',')} <<`
        ];
        doc.text(summaryText, 14, 52);
        let startY = 52 + (summaryText.length * 5) + 5;

        doc.setFontSize(12);
        doc.text("Vendas Detalhadas", 14, startY);
        startY += 7;
        const salesTableColumns = ["Data", "Cliente", "Valor Total", "Fiado", "Pago Din.", "Pago Pix", "FP"];
        const salesTableRows = filteredSales.map(sale => [
            sale.Data?.seconds ? new Date(sale.Data.seconds * 1000).toLocaleString('pt-BR') : 'N/A',
            sale.Cliente?.nome || 'N/A',
            `R$ ${sale.TotalVenda?.toFixed(2) || '0.00'}`,
            `R$ ${(sale.Fiado || 0).toFixed(2)}`,
            `R$ ${(sale.PagoDinheiro || 0).toFixed(2)}`,
            `R$ ${(sale.PagoPix || 0).toFixed(2)}`,
            sale.FormaPagamento || 'N/A'
        ]);
        doc.autoTable({ head: [salesTableColumns], body: salesTableRows, startY: startY, theme: 'grid', headStyles: { fillColor: [22, 160, 133] }, styles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 40 } } });
        startY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text("Pagamentos de Fiado Recebidos", 14, startY);
        startY += 7;
        const pagamentosTableColumns = ["Data", "Cliente", "Valor", "Forma Pagamento"];
        const pagamentosTableRows = allPagamentos.map(p => [
            p.data?.seconds ? new Date(p.data.seconds * 1000).toLocaleString('pt-BR') : 'N/A',
            p.clienteNome || 'N/A',
            `R$ ${(Number(p.valor) || 0).toFixed(2)}`,
            p.formaPagamento || 'N/A'
        ]);
        doc.autoTable({ head: [pagamentosTableColumns], body: pagamentosTableRows, startY: startY, theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 60 } } });

        const filename = `Relatorio_Vendas_Pagamentos_${dateFilter.type}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div id='vendas'>
            <section id='filtersSection'>
                <h2>Filtros</h2>
                <div id='clientFilter'>
                    <label htmlFor="filterName">Filtrar por nome cliente (Vendas):</label>
                    <input
                        className='form-control'
                        type="text"
                        id="filterName"
                        value={filterName}
                        onChange={handleFilterNameChange}
                        placeholder="Digite o nome do cliente"
                    />
                </div>
                <div id='dateFilter'>
                    <label htmlFor="dateFilterType">Filtrar por período:</label>
                    <select
                        id="dateFilterType"
                        className="form-control"
                        value={dateFilter.type}
                        onChange={handleDateFilterChange}
                    >
                        <option value="today">Hoje</option>
                        <option value="yesterday">Ontem</option>
                        <option value="last7days">Últimos 7 dias</option>
                        <option value="last15days">Últimos 15 dias</option>
                        <option value="last30days">Últimos 30 dias</option>
                        <option value="last60days">Últimos 60 dias</option>
                        <option value="last90days">Últimos 90 dias</option>
                        <option value="last180days">Últimos 180 dias</option>
                        <option value="last365days">Últimos 365 dias</option>
                        <option value="allTime">Todos os tempos</option>
                        <option value="specific">Data específica</option>
                    </select>
                </div>
                {dateFilter.type === 'specific' && (
                    <div id='specificDateFilter'>
                        <label htmlFor="specificDateValue">Selecionar data:</label>
                        <input
                            type="date"
                            id="specificDateValue"
                            value={dateFilter.specificDate}
                            onChange={handleSpecificDateChange}
                            className='form-control'
                        />
                    </div>
                )}
                <div id='exportReportButton' style={{ marginTop: '15px' }}>
                    <button onClick={exportReportPDF} className='btn btn-primary'>
                        Exportar Relatório PDF
                    </button>
                </div>
            </section>

            <section id='summaryAndKpisSection'>
                <h2>Resumo: {currentPeriodDescription}</h2>
                <div id='kpisSection' style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <h3>Indicadores Chave (KPIs)</h3>
                    <p><strong>Nº Vendas:</strong> {filteredSales.length}</p>
                    <p><strong>Nº Pagamentos Fiado:</strong> {allPagamentos.length}</p>
                    <p><strong>% Vendas Fiado:</strong> {fiadoPercentage.toFixed(1)}%</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <label htmlFor="profitMarginInput"><strong>Lucro Estimado (@</strong></label>
                        <input
                            type="number"
                            id="profitMarginInput"
                            value={profitMargin}
                            onChange={handleProfitMarginChange}
                            min="0"
                            max="100"
                            step="1"
                            style={{ width: '60px', padding: '2px 5px' }}
                            className='form-control'
                        />
                        <label htmlFor="profitMarginInput"><strong>%):</strong> R$ {estimatedProfit.toFixed(2).replace('.', ',')}</label>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                    <div id='salesNumbers'>
                        <h4>Vendas</h4>
                        <p><strong>Total Vendido:</strong> R$ {totalSalesValue.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Total Fiado Gerado:</strong> R$ {totalFiadoValue.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Dinheiro):</strong> R$ {totalSalesDinheiro.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Pix):</strong> R$ {totalSalesPix.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Cartão):</strong> R$ {totalSalesCartaoDebito.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Total Vendas):</strong> R$ {(totalSalesDinheiro + totalSalesPix + totalSalesCartaoDebito).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div id='pagamentosNumbers'> {/* Supondo que o ID seja este ou similar */}
                        <h4>Pagamentos Recebidos (Fiado)</h4>
                        <p><strong>Recebido (Dinheiro):</strong> R$ {totalPagamentosDinheiro.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Pix):</strong> R$ {totalPagamentosPix.toFixed(2).replace('.', ',')}</p>
                        <p><strong>Recebido (Cartão):</strong> R$ {totalPagamentosCartao.toFixed(2).replace('.', ',')}</p> {/* Nova linha */}
                        <p><strong>Recebido (Total Pagamentos):</strong> R$ {totalPagamentosGeral.toFixed(2).replace('.', ',')}</p> {/* totalPagamentosGeral já inclui todos os métodos */}
                    </div>

                </div>
                <div id='totalCaixa' style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #666', textAlign: 'center', fontSize: '1.2em' }}>
                    <h3 style={{ marginBottom: '10px' }}>Total em Caixa no Período</h3>
                    <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#27ae60' }}>
                        R$ {totalEmCaixa.toFixed(2).replace('.', ',')}
                    </p>
                    <small>(Soma de: Vendas Dinheiro + Vendas Pix + Vendas Cartão (débito) + Total Pagamentos Fiado)</small>
                </div>
            </section>

            <section id='salesSection'>
                <h2>Vendas Filtradas ({filteredSales.length})</h2>
                {filteredSales.length === 0 && !loading && (
                    <p>Nenhuma venda encontrada para os filtros selecionados.</p>
                )}
                <ul>
                    {currentSales.map((sale) => (
                        <li className='individualSale' key={sale.id} onClick={() => openSaleDetails(sale)}>
                            <span><strong>{sale.Cliente?.nome || 'Cliente não informado'}</strong></span>
                            <span><strong>Valor: </strong>R${(sale.TotalVenda || 0).toFixed(2)}</span>
                            <span><strong>Data: </strong>{sale.Data?.seconds ? new Date(sale.Data.seconds * 1000).toLocaleString('pt-BR') : 'Data inválida'}</span>
                            <span><strong>FP: </strong>{sale.FormaPagamento || 'N/A'}</span>
                            <span><strong>ID: </strong>{sale.id || 'N/A'}</span>
                        </li>
                    ))}
                </ul>
                <Pagination
                    currentPage={salesCurrentPage}
                    totalPages={salesTotalPages}
                    onPageChange={setSalesCurrentPage}
                />
            </section>

            <section id='pagamentosSection'>
                <h2>Pagamentos de Fiado Recebidos ({allPagamentos.length})</h2>
                {allPagamentos.length === 0 && !loading && (
                    <p>Nenhum pagamento encontrado para o período selecionado.</p>
                )}
                <ul>
                    {currentPagamentos.map((pagamento) => (
                        <li className='individualPagamento' key={pagamento.id}>
                            <span><strong>Cliente: </strong>{pagamento.clienteNome || 'Não informado'}</span>
                            <span><strong>Valor: </strong>R${(Number(pagamento.valor) || 0).toFixed(2)}</span>
                            <span><strong>Data: </strong>{pagamento.data?.seconds ? new Date(pagamento.data.seconds * 1000).toLocaleString('pt-BR') : 'Data inválida'}</span>
                            <span><strong>FP: </strong>{pagamento.formaPagamento || 'N/A'}</span>
                            <span><strong>ID: </strong>{pagamento.id || 'N/A'}</span>
                        </li>
                    ))}
                </ul>
                <Pagination
                    currentPage={pagamentosCurrentPage}
                    totalPages={pagamentosTotalPages}
                    onPageChange={setPagamentosCurrentPage}
                />
            </section>

            {showModal && selectedSale && (
                <div id='modal' onClick={closeModal}>
                    <div id="modalContent" onClick={(e) => e.stopPropagation()}>
                        <button id='closeModal' className="material-symbols-outlined" onClick={closeModal}>close</button>
                        <h2>Detalhes da Venda:</h2>
                        <p><strong>Operador:</strong> {selectedSale.Operador || 'N/A'}</p>
                        <p><strong>Cliente:</strong> {selectedSale.Cliente?.nome || 'N/A'}</p>
                        <p><strong>Telefone:</strong> {selectedSale.Cliente?.telefone || 'N/A'}</p>
                        <p><strong>Data:</strong> {selectedSale.Data?.seconds ? new Date(selectedSale.Data.seconds * 1000).toLocaleString('pt-BR') : 'N/A'}</p>
                        <p><strong>Total:</strong> R$ {(selectedSale.TotalVenda || 0).toFixed(2)}</p>

                        {selectedSale.PagoDinheiro > 0 && (
                            <p><strong>Pago em Dinheiro:</strong> R$ {(selectedSale.PagoDinheiro || 0).toFixed(2)}</p>
                        )}

                        {selectedSale.PagoPix > 0 && (
                            <p><strong>Pago em Pix:</strong> R$ {(selectedSale.PagoPix || 0).toFixed(2)}</p>
                        )}

                        {selectedSale.PagoCartao > 0 && (
                            <>
                                <p><strong>Pago em Cartão:</strong> R$ {(selectedSale.PagoCartao || 0).toFixed(2)}</p>
                                {selectedSale.TipoCartao && (
                                    <p><strong>Tipo de Cartão:</strong> {selectedSale.TipoCartao === 'credito' ? 'Crédito' : 'Débito'}</p>
                                )}
                                {selectedSale.TipoCartao === 'credito' && selectedSale.ParcelasCartao > 0 && (
                                    <p><strong>Parcelas:</strong> {selectedSale.ParcelasCartao}x</p>
                                )}
                            </>
                        )}

                        {selectedSale.Fiado > 0 && (
                            <p><strong>Fiado:</strong> R$ {(selectedSale.Fiado || 0).toFixed(2)}</p>
                        )}

                        <p><strong>Forma Pagamento Predominante:</strong> {selectedSale.FormaPagamento || 'N/A'}</p>

                        <ul>
                            <strong><h3>Itens da Venda:</h3></strong>
                            {(selectedSale.Lista || []).map((item, index) => (
                                <strong>
                                    <li key={index}>{item.quantity}x {item.nome} - <i>R$ {(item.preco || 0).toFixed(2)}</i></li>
                                </strong>
                            ))}
                        </ul>
                        <div className='modalActions'>
                            {/* Botão chama a função implementada agora */}
                            <button onClick={exportSalePDF} className='btn btn-primary'>Exportar PDF Venda</button>
                            <button onClick={handleDeleteSale} className='btn btn-danger'>Excluir Venda</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vendas;

