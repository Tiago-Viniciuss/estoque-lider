import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, setDoc, onSnapshot, deleteDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from './LoadingSpinner';
import '../styles/Clientes.css'; // Certifique-se que o caminho está correto
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Clientes = () => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [filterName, setFilterName] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [payment, setPayment] = useState(''); // Usar string vazia para inputs controlados
    const [loading, setLoading] = useState(false);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [newClient, setNewClient] = useState({
        nome: '',
        telefone: '',
        divida: 0,
    });
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const empresaId = localStorage.getItem('empresaId');
    const [paymentMethod, setPaymentMethod] = useState("");

    // Função para abrir modal de edição
    const openEditingModal = (client) => {
        // Garante que divida seja um número ao abrir o modal
        setSelectedClient({ ...client, divida: parseFloat(client.divida) || 0 });
        setShowEditClientModal(true);
    }

    // Função para abrir modal de pagamento
    const openPaymentModal = (client) => {
        setSelectedClient(client);
        setPayment(''); // Limpa valor do pagamento anterior
        setPaymentMethod(''); // Limpa método de pagamento anterior
        setShowPaymentModal(true);
    }

    // Função para buscar clientes (pode ser removida se o listener for suficiente)
    /*
    const fetchClients = async () => { ... };
    */

    // Função de filtro por nome
    const handleFilter = (name) => {
        setFilterName(name);
        // O filtro é aplicado automaticamente pelo useEffect
    };

    // Listener em tempo real
    useEffect(() => {
        if (!empresaId) return;
        setLoading(true);
        const clientsRef = collection(db, `Empresas/${empresaId}/Clientes`);
        const q = query(clientsRef); // Pode adicionar orderBy aqui se quiser

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let clientsData = [];
            snapshot.forEach((doc) => {
                const clientData = doc.data();
                clientsData.push({
                    id: doc.id,
                    telefone: clientData.telefone || '',
                    nome: clientData.nome || 'Nome não encontrado',
                    comprasFeitas: clientData.comprasFeitas || 0,
                    totalGasto: clientData.totalGasto || 0,
                    divida: clientData.divida || 0,
                });
            });
            clientsData = clientsData.sort((a, b) => a.nome.localeCompare(b.nome));
            setClients(clientsData);
            // Reaplicar filtro após atualização
            const currentFilter = filterName.trim().toLowerCase();
            if (currentFilter === '') {
                setFilteredClients(clientsData);
            } else {
                const filtered = clientsData.filter((client) =>
                    client.nome.toLowerCase().includes(currentFilter)
                );
                setFilteredClients(filtered);
            }
            setLoading(false);
        }, (error) => {
            console.error("Erro no listener do Firestore: ", error);
            setLoading(false);
        });

        return () => unsubscribe(); // Limpa o listener
    }, [empresaId, filterName]); // Re-executa se empresaId ou filterName mudar

    // Função para criar cliente
    const createClient = async (e) => {
        e.preventDefault();
        const { nome, telefone } = newClient;
        if (!nome || !telefone) {
            alert('Preencha nome e telefone!');
            return;
        }
        setLoading(true);
        try {
            const clientNameTrimmed = nome.trim();
            const clientsRef = collection(db, `Empresas/${empresaId}/Clientes`);
            await addDoc(clientsRef, {
                nome: clientNameTrimmed,
                telefone: telefone.trim(),
                criadoEm: Timestamp.now(),
                divida: parseFloat(newClient.divida) || 0,
                dataUltimoPagamento: '',
                nomeMinusculo: clientNameTrimmed.toLowerCase(),
                totalGasto: 0,
                comprasFeitas: 0
            });
            alert('Cliente criado com sucesso!');
            setNewClient({ nome: '', telefone: '', divida: 0 });
            setShowAddClientModal(false);
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            alert('Erro ao criar cliente.');
        } finally {
            setLoading(false);
        }
    };

    // Função para salvar dados editados do cliente (INCLUINDO DÍVIDA)
    const saveEditedClientData = async (e) => {
        e.preventDefault();
        if (!selectedClient || !selectedClient.id) {
            alert("Erro: Cliente não selecionado ou ID inválido.");
            return;
        }

        const dividaValue = parseFloat(selectedClient.divida);
        if (isNaN(dividaValue) || dividaValue < 0) {
             alert("Erro: O valor da dívida deve ser um número positivo ou zero.");
             return;
        }

        // Confirmação extra para alteração de dívida
        const confirmation = window.confirm(`Confirma a alteração dos dados de ${selectedClient.nome}, incluindo a dívida para R$ ${dividaValue.toFixed(2)}?`);
        if (!confirmation) {
            return;
        }

        setLoading(true);
        try {
            const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, selectedClient.id);
            await updateDoc(clientRef, {
                nome: selectedClient.nome.trim(),
                telefone: selectedClient.telefone.trim(),
                divida: dividaValue, // Salva a dívida editada
                nomeMinusculo: selectedClient.nome.trim().toLowerCase(),
            });
            alert('Dados do cliente atualizados com sucesso!');
            setShowEditClientModal(false);
            setSelectedClient(null);
        } catch (error) {
            console.error("Erro ao atualizar cliente:", error);
            alert("Erro ao salvar. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // Função para deletar cliente
    const handleDeleteClient = async (clientId, clientName) => {
        const confirmation = window.confirm(`Tem certeza que deseja excluir ${clientName}? Esta ação não pode ser desfeita.`);
        if (confirmation) {
            setLoading(true);
            try {
                const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, clientId);
                await deleteDoc(clientRef);
                alert('Cliente excluído com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                alert('Erro ao excluir.');
            } finally {
                setLoading(false);
            }
        }
    };

    // Função para processar pagamento
    const handlePayment = async (e) => {
        e.preventDefault();
        const paymentValue = parseFloat(payment);
        if (!selectedClient || !selectedClient.id || !paymentValue || paymentValue <= 0 || !paymentMethod) {
            alert("Selecione o cliente, insira um valor válido e escolha a forma de pagamento.");
            return;
        }
        if (paymentValue > selectedClient.divida) {
            alert("O valor do pagamento não pode ser maior que a dívida atual.");
            return;
        }

        setLoading(true);
        const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, selectedClient.id);
        const newDebt = Math.max(0, selectedClient.divida - paymentValue);

        try {
            await updateDoc(clientRef, {
                 divida: newDebt,
                 dataUltimoPagamento: Timestamp.now()
            });

            const pagamentosRef = collection(db, `Empresas/${empresaId}/Pagamentos`);
            await addDoc(pagamentosRef, {
                clienteId: selectedClient.id,
                clienteNome: selectedClient.nome,
                valor: paymentValue,
                data: Timestamp.now(),
                tipo: "Fiado",
                formaPagamento: paymentMethod
            });

            alert(`Pagamento de R$ ${paymentValue.toFixed(2)} realizado! Nova dívida: R$ ${newDebt.toFixed(2)}`);
            setShowPaymentModal(false);
            setSelectedClient(null);
            setPayment('');
            setPaymentMethod('');
        } catch (error) {
            console.error("Erro ao processar pagamento:", error);
            alert("Erro ao processar pagamento.");
        } finally {
            setLoading(false);
        }
    };

    // Função para calcular dívida total
    const calculateTotalDebt = () => {
        // Usar filteredClients para refletir o filtro atual no total
        return filteredClients.reduce((total, client) => total + (client.divida || 0), 0).toFixed(2);
    };

    // Função para gerar PDF
    const gerarPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Lista de Clientes - ${filterName ? 'Filtro: ' + filterName : 'Todos'}`, 14, 15);

        const tableColumn = ["Nome", "Telefone", "Dívida Atual (R$)", "Total Gasto (R$)"];
        const tableRows = [];
        let totalFiado = 0;

        filteredClients.forEach(client => {
            const divida = client.divida || 0;
            const row = [
                client.nome,
                client.telefone || 'N/A',
                divida.toFixed(2),
                (client.totalGasto || 0).toFixed(2)
            ];
            tableRows.push(row);
            totalFiado += divida;
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] },
            styles: { fontSize: 9 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString();
        const horaFormatada = dataAtual.toLocaleTimeString();

        doc.setFontSize(12);
        doc.text(`Total de fiado (filtrado): R$ ${totalFiado.toFixed(2)}`, 14, finalY);
        doc.text(`Total de clientes (filtrado): ${filteredClients.length}`, 14, finalY + 7);
        doc.text(`Gerado em: ${dataFormatada} às ${horaFormatada}`, 14, finalY + 14);

        doc.save(`lista_clientes_${filterName ? filterName + '_' : ''}${dataFormatada}.pdf`);
    };

    // Input change handler para edição (incluindo dívida)
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        // Para dívida, converter para número ao mudar, mas manter como string no estado se necessário
        // Ou converter apenas ao salvar
        setSelectedClient(prev => ({ ...prev, [name]: value }));
    };

    if (loading && clients.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <div id="clientes">
            {/* --- Filtro --- */}
            <div id="filterContainer">
                <label htmlFor="filterName">Filtrar por Nome:</label>
                <input
                    type="text"
                    id="filterName"
                    value={filterName}
                    onChange={(e) => handleFilter(e.target.value)}
                    placeholder="Digite o nome do cliente"
                    className="form-control"
                />
                 <button onClick={gerarPDF} className="btn btn-secondary btn-sm" id='generatePDF' title="Gerar PDF da Lista Filtrada">
                    <span className="material-symbols-outlined">picture_as_pdf</span> PDF
                </button>
            </div>

            {/* --- Container da Lista (Cards e Tabela) --- */}
            <div id="clientsListContainer">
                {/* Tabela para telas maiores (controlada via CSS) */}
                <table id="clientsList">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Dívida Atual</th>
                            <th>Total Gasto</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Nenhum cliente encontrado{filterName ? ' para este filtro' : ''}.</td></tr>
                        )}
                        {filteredClients.map((client) => (
                            <tr key={client.id + '-row'} className="client-table-row">
                                <td onClick={() => openEditingModal(client)} style={{ cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }}>
                                    {client.nome}
                                </td>
                                <td>{client.telefone || 'N/A'}</td>
                                <td style={{ color: client.divida > 0 ? 'var(--danger-color)' : 'inherit', fontWeight: client.divida > 0 ? 'bold' : 'normal' }}>
                                    R$ {client.divida.toFixed(2)}
                                </td>
                                <td>R$ {(client.totalGasto || 0).toFixed(2)}</td>
                                <td className="actions">
                                    {client.divida > 0 && (
                                        <button
                                            className="btn btn-dark btn-sm"
                                            onClick={() => openPaymentModal(client)}
                                            title='Pagar Dívida'
                                        >
                                            <span className='material-symbols-outlined'>attach_money</span> Pagar
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-light btn-sm"
                                        onClick={() => openEditingModal(client)}
                                        title='Editar Cliente'
                                    >
                                        <span className='material-symbols-outlined'>edit</span> Editar
                                    </button>
                                    {client.divida === 0 && (
                                        <button
                                            className="btn-icon delete-icon" // Classe específica para deletar
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClient(client.id, client.nome);
                                            }}
                                            title='Deletar Cliente'
                                        >
                                            <span className='material-symbols-outlined'>delete</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                     <tfoot>
                        <tr>
                            <td colSpan="2"><strong>Total de Clientes (Filtrado):</strong></td>
                            <td><strong>{filteredClients.length}</strong></td>
                            <td><strong>Dívida Total (Filtrado):</strong></td>
                            <td colSpan="1"><strong>R$ {calculateTotalDebt()}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Cards para Mobile (controlado via CSS) */}
                 {filteredClients.length === 0 && !loading && (
                     <p style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff', borderRadius: 'var(--border-radius)' }}>Nenhum cliente encontrado{filterName ? ' para este filtro' : ''}.</p>
                 )}
                {filteredClients.map((client) => (
                    <div key={client.id + '-card'} className="client-card">
                        <div className="client-info" onClick={() => openEditingModal(client)} style={{ cursor: 'pointer' }}>
                            <span><strong>Nome:</strong> {client.nome}</span>
                            <span><strong>Telefone:</strong> {client.telefone || 'N/A'}</span>
                            <span><strong>Total Gasto:</strong> R$ {(client.totalGasto || 0).toFixed(2)}</span>
                        </div>
                        <div className={`client-debt ${client.divida > 0 ? '' : 'zero'}`}>
                            Dívida: R$ {client.divida.toFixed(2)}
                        </div>
                        <div className="actions">
                            {client.divida > 0 && (
                                <button
                                    className="btn btn-dark btn-sm"
                                    onClick={() => openPaymentModal(client)}
                                >
                                    <span className='material-symbols-outlined'>attach_money</span> Pagar
                                </button>
                            )}
                             <button
                                className="btn btn-light btn-sm"
                                onClick={() => openEditingModal(client)}
                            >
                                <span className='material-symbols-outlined'>edit</span> Editar
                            </button>
                            {client.divida === 0 && (
                                <button
                                    className="btn-icon delete-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client.id, client.nome);
                                    }}
                                    title='Deletar Cliente'
                                >
                                    <span className='material-symbols-outlined'>delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Botão Flutuante para Adicionar Cliente */}
            <button id="addClient" onClick={() => setShowAddClientModal(true)} title="Adicionar Novo Cliente">
                <span className="material-symbols-outlined">add</span>
            </button>

            {/* --- Modais --- */} 

            {/* Modal Adicionar Cliente */} 
            {showAddClientModal && (
                <div id="addClientContainer" className="modal-background">
                    <form id="addClientForm" className="modal-content" onSubmit={createClient}>
                        <button type="button" id="closeFormButton" className="material-symbols-outlined" onClick={() => setShowAddClientModal(false)}>close</button>
                        <h2>Novo Cliente</h2>
                        <label htmlFor="newClientName">Nome:</label>
                        <input
                            type="text"
                            id="newClientName"
                            value={newClient.nome}
                            onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                            required
                        />
                        <label htmlFor="newClientPhone">Telefone:</label>
                        <input
                            type="tel"
                            id="newClientPhone"
                            value={newClient.telefone}
                            onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                            required
                        />
                        <div className="modal-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cliente'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal Editar Cliente (COM CAMPO DE DÍVIDA) */} 
            {showEditClientModal && selectedClient && (
                <div id="editClientModal" className="modal-background">
                    <form id="editClientForm" className="modal-content" onSubmit={saveEditedClientData}>
                         <button type="button" id="closeEditButton" className="material-symbols-outlined" onClick={() => setShowEditClientModal(false)}>close</button>
                        <h2>Editar Cliente</h2>
                        <label htmlFor="editClientName">Nome:</label>
                        <input
                            type="text"
                            id="editClientName"
                            name="nome" // importante ter o name para o handler
                            value={selectedClient.nome}
                            onChange={handleEditInputChange}
                            required
                        />
                        <label htmlFor="editClientPhone">Telefone:</label>
                        <input
                            type="tel"
                            id="editClientPhone"
                            name="telefone"
                            value={selectedClient.telefone}
                            onChange={handleEditInputChange}
                            required
                        />
                        {/* CAMPO PARA EDITAR DÍVIDA */}
                        <label htmlFor="editClientDebt">Dívida Atual:</label>
                        <input
                            type="number"
                            id="editClientDebt"
                            name="divida" // importante ter o name
                            step="0.01"
                            min="0" // Dívida não pode ser negativa
                            value={selectedClient.divida} // Controlado pelo estado
                            onChange={handleEditInputChange}
                            required
                        />
                        <p style={{fontSize: '0.8em', color: 'var(--secondary-color)', marginTop: '-10px', marginBottom: '15px'}}>Ajuste manual da dívida. Use com cuidado.</p>

                        <div className="modal-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal Pagamento */} 
            {showPaymentModal && selectedClient && (
                <div id="paymentModal" className="modal-background">
                    <form id="paymentBody" className="modal-content" onSubmit={handlePayment}>
                        <button type="button" id="closePaymentButton" className="material-symbols-outlined" onClick={() => setShowPaymentModal(false)}>close</button>
                        <h2>Pagar Dívida</h2>
                        <p>Cliente: <strong>{selectedClient.nome}</strong></p>
                        <p>Dívida Atual: <strong className='debtColor'>R$ {selectedClient.divida.toFixed(2)}</strong></p>

                        <label htmlFor="paymentValue">Valor do Pagamento:</label>
                        <input
                            type="number"
                            id="paymentValue"
                            step="0.01"
                            min="0.01"
                            max={selectedClient.divida} // Não permitir pagar mais que a dívida
                            value={payment}
                            onChange={(e) => setPayment(e.target.value)} // Atualiza como string
                            placeholder="0.00"
                            required
                        />
                         <label htmlFor="paymentMethodSelect">Forma de Pagamento:</label>
                         <select 
                            id="paymentMethodSelect" 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            required
                         >
                            <option value="" disabled>-- Selecione --</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Pix">Pix</option>
                            {/* Adicionar outras formas se necessário */}
                         </select>

                        <div className="modal-actions">
                            <button id="confirmPayment" type="submit" className="btn btn-success" disabled={loading || !payment || !paymentMethod || parseFloat(payment) <= 0 || parseFloat(payment) > selectedClient.divida}>
                                {loading ? 'Processando...' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Clientes;

