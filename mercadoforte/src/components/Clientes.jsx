import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, setDoc, onSnapshot, deleteDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from './LoadingSpinner';
import '../styles/Clientes.css';
import { use } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Clientes = () => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [filterName, setFilterName] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [payment, setPayment] = useState(); // Novo valor de pagamento
    const [loading, setLoading] = useState(false);
    const [addClient, setAddClient] = useState(false);
    const [newClient, setNewClient] = useState({
        nome: '',
        telefone: '',
        divida: 0,
    });
    const [editClientModal, setEditClientModal] = useState(false);
    const [paymentModal, setPaymentModal] = useState(true);
    const [totalPayment, setTotalPayment] = useState(0);
    const [partialPayment, setPartialPayment] = useState(0);
    const empresaId = localStorage.getItem('empresaId');
    const [paymentMethod, setPaymentMethod] = useState("");



    const openEditingModal = (client) => {
        setSelectedClient(client)
        setEditClientModal(true);
    }

    // Função para buscar todos os clientes e agrupar as vendas
    const fetchClients = async () => {
        setLoading(true);
        try {
            const clientsRef = collection(db, `Empresas/${empresaId}/Clientes`);
            const salesRef = collection(db, 'Vendas');

            const [clientsSnapshot, salesSnapshot] = await Promise.all([
                getDocs(clientsRef),
                getDocs(salesRef),
            ]);

            const salesByName = {};
            salesSnapshot.forEach((doc) => {
                const saleData = doc.data();
                const clientName = saleData.Cliente.nome;

                if (salesByName[clientName]) {
                    salesByName[clientName].push(saleData);
                } else {
                    salesByName[clientName] = [saleData];
                }
            });

            let clientsData = [];
            clientsSnapshot.forEach((doc) => {
                const clientData = doc.data();
                const clientName = clientData.nome;
                const clientPhone = clientData.telefone;
                const clientSales = clientData.totalGasto || 0;
                const clientDivida = clientData.divida || 0;
                const sales = salesByName[clientName] || [];

                clientsData.push({
                    telefone: clientPhone,
                    nome: clientName,
                    comprasFeitas: sales.length, // Número de vendas por cliente
                    totalGasto: clientSales, // Total gasto pelo cliente
                    divida: clientDivida, // Dívida atual
                });
            });

            // Ordenar clientes por ordem alfabética (baseado no nome)
            clientsData = clientsData.sort((a, b) => a.nome.localeCompare(b.nome));

            setClients(clientsData);
            setFilteredClients(clientsData);
        } catch (error) {
            console.error('Erro ao buscar clientes e vendas:', error);
        } finally {
            setLoading(false);
        }
    };


    // Função de filtro por nome
    const handleFilter = (name) => {
        setFilterName(name);
        if (name.trim() === '') {
            setFilteredClients(clients);
        } else {
            const filtered = clients.filter((client) =>
                client.nome.toLowerCase().includes(name.toLowerCase())
            );
            setFilteredClients(filtered);
        }
    };

    // Adicionando o `onSnapshot` para ouvir em tempo real as mudanças no Firebase
    useEffect(() => {
        fetchClients(); // Chama a função para buscar os dados ao montar o componente

        const unsub = onSnapshot(collection(db, `Empresas/${empresaId}/Clientes`), (snapshot) => {
            const updatedClients = [];
            snapshot.forEach((doc) => {
                const clientData = doc.data();
                updatedClients.push({
                    telefone: clientData.telefone,
                    nome: clientData.nome,
                    divida: clientData.divida || 0,
                });
            });

            setClients(updatedClients);
            setFilteredClients(updatedClients);
        });

        // Limpeza do listener quando o componente for desmontado
        return () => unsub();
    }, []);

    const createClient = async (e) => {
        e.preventDefault();
        const { nome, telefone } = newClient;

        if (!nome || !telefone) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        try {
            const clientName = nome.trim();
            const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, clientName);

            const clientData = {
                nome,
                telefone,
                criadoEm: new Date(),
                divida: parseFloat(newClient.divida) || 0,
                dataUltimoPagamento: '', nomeMinusculo: nome.toLowerCase(),
            };

            await setDoc(clientRef, clientData);
            alert('Cliente criado com sucesso!');
            setNewClient({ nome: '', telefone: '', divida: 0 });
            closeForm();
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            alert('Erro ao criar cliente. Tente novamente.');
        }
    };

    const saveClientData = async (client) => {
        if (!client || !client.nome || !client.telefone) {
            console.error("Dados do cliente incompletos. Verifique antes de salvar.");
            alert("Erro: Dados do cliente estão incompletos.");
            return;
        }

        try {
            const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, client.nome); // Usando o como ID
            const updatedData = {
                nome: client.nome,
                telefone: client.telefone,
                divida: client.divida,
                nomeMinusculo: client.nome.toLowerCase(),
            };

            await updateDoc(clientRef, updatedData);
            console.log("Cliente atualizado com sucesso!");
            alert("Dados do cliente atualizados com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar cliente no Firebase:", error);
            alert("Erro ao salvar os dados. Por favor, tente novamente.");
        }
    };


    const handleDeleteClient = async (client) => {
        const confirmation = window.confirm(`Tem certeza que deseja excluir o cliente ${client.nome}?`);
        if (confirmation) {
            try {
                const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, client.nome);
                await deleteDoc(clientRef); // Exclui o cliente
                alert('Cliente excluído com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                alert('Erro ao excluir cliente. Tente novamente.');
            }
        }
    };


    const handleAddClient = () => {
        setAddClient(true);
    };

    const closeForm = () => {
        setAddClient(false);
    };

    const calculateTotalDebt = () => {
        return clients.reduce((total, client) => total + (client.divida || 0), 0).toFixed(2);
    };

    /*const updateClientsWithTotalGasto = async () => {
        const clientsRef = collection(db, `Empresas/${empresaId}/Clientes`);
        const clientsSnapshot = await getDocs(clientsRef);
    
        clientsSnapshot.forEach(async (clientDoc) => {
            const clientData = clientDoc.data();
            if (clientData.totalGasto === undefined) {
                const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, clientDoc.id);
                await updateDoc(clientRef, { totalGasto: 0 });
            }
        });
    
        console.log('Atualização concluída!');
    };

    useEffect(() => {
        updateClientsWithTotalGasto();
    }, []);*/



    const handlePayment = async () => {
        setPaymentModal(true);
        if (!selectedClient || payment <= 0 || !paymentMethod) {
            alert("Insira um valor válido e selecione a forma de pagamento.");
            return;
        }

        const clientRef = doc(db, `Empresas/${empresaId}/Clientes`, selectedClient.nome);
        const newDebt = Math.max(selectedClient.divida - payment, 0);

        try {
            // Atualiza a dívida do cliente
            await updateDoc(clientRef, { divida: newDebt });

            // Adiciona registro do pagamento à coleção Pagamentos
            const pagamentosRef = collection(db, `Empresas/${empresaId}/Pagamentos`);
            await addDoc(pagamentosRef, {
                cliente: selectedClient.nome,
                valor: payment,
                data: Timestamp.now(),
                tipo: "Fiado",
                formaPagamento: paymentMethod // dinheiro ou pix
            });

            alert(`Pagamento de R$ ${payment.toFixed(2)} realizado com sucesso! Nova dívida: R$ ${newDebt.toFixed(2)}`);
            setPayment(0);
            setPaymentMethod(""); // Resetar forma de pagamento se desejar
            setPaymentModal(false);
            fetchClients(); // Atualiza os dados
        } catch (error) {
            console.error("Erro ao processar pagamento:", error);
            alert("Erro ao processar pagamento. Tente novamente.");
        }
    };

    const gerarPDF = () => {
        const doc = new jsPDF();
    
        doc.setFontSize(16);
        doc.text('Lista de Clientes', 14, 15);
    
        const tableColumn = ["Nome", "Telefone", "Compras Feitas", "Dívida Atual (R$)", "Total Gasto (R$)"];
        const tableRows = [];
    
        let totalFiado = 0;
    
        clients.forEach(client => {
            const divida = client.divida || 0;
            const row = [
                client.nome,
                client.telefone,
                client.comprasFeitas || 0,
                divida.toFixed(2),
                client.totalGasto?.toFixed(2) || "0.00"
            ];
            tableRows.push(row);
            totalFiado += divida;
        });
    
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
        });
    
        const finalY = doc.lastAutoTable.finalY + 10;
    
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString();
        const horaFormatada = dataAtual.toLocaleTimeString();
    
        doc.setFontSize(12);
        doc.text(`Total de fiado: R$ ${totalFiado.toFixed(2)}`, 14, finalY);
        doc.text(`Total de clientes: ${clients.length}`, 14, finalY + 7);
        doc.text(`Gerado em: ${dataFormatada} às ${horaFormatada}`, 14, finalY + 14);
    
        doc.save("lista_clientes.pdf");
    };


    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div id="clientes">
            <div>
                <label htmlFor="filterName">Filtrar por Nome:</label>
                <input
                    type="text"
                    id="filterName"
                    value={filterName}
                    onChange={(e) => handleFilter(e.target.value)}
                    placeholder="Digite o nome do cliente"
                    className="form-control"
                />
            </div>

            <table id="clientsList">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Telefone</th>
                        <th>Compras Feitas</th>
                        <th>Dívida Atual</th>
                        <th>Gastos</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredClients.map((client, index) => (
                        <tr key={index}>
                            <td className='openClientModal'
                                onClick={() => {
                                    // Define o cliente selecionado
                                    openEditingModal(client); // Abre o modal de edição
                                }}
                            >
                                {client.nome}
                            </td>
                            <td>{client.telefone}</td>
                            <td>{client.comprasFeitas}</td>
                            <td style={{ color: client.divida > 0 ? 'red' : 'black' }}>
                                {client.divida.toFixed(2)}
                            </td>
                            <td>{client.totalGasto}</td>
                            <td className="actions">
                                {client.divida > 0 && (
                                    <button id="payBill"
                                        className="btn btn-success"
                                        onClick={() => {
                                            setSelectedClient(client);
                                            setPaymentModal(true);
                                        }} title='Pagar Dívida'
                                    >
                                        Pagar Dívida <span className='material-symbols-outlined'>attach_money</span>
                                    </button>
                                )}
                                {client.divida === 0 && (
                                    <button id="deleteClient" className='material-symbols-outlined'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClient(client); // Deleta o cliente
                                        }} title='Deletar Cliente'
                                    >
                                        delete
                                    </button>
                                )
                                }

                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>

                    <tr>
                        <td colSpan="4">Dívida total dos clientes</td>
                        <td><strong>{calculateTotalDebt()}</strong></td>
                    </tr>
                </tfoot>
            </table>
            {/*paymentModal && selectedClient && (
                <div className="modal">
                    <h3>Pagar dívida de {selectedClient.nome}</h3>
                    <p>Dívida atual: R$ {selectedClient.divida.toFixed(2)}</p>
                    <input
                        type="number"
                        value={payment}
                        onChange={(e) => setPayment(parseFloat(e.target.value) || 0)}
                        placeholder="Digite o valor do pagamento"
                    />
                    <button onClick={handlePayment}>Confirmar Pagamento</button>
                    <button onClick={() => setPaymentModal(false)}>Cancelar</button>
                </div>
            )*/}
            {paymentModal && selectedClient && (
                <div id="paymentModal">
                    <div id="paymentBody">
                        <h3>Pagar dívida de {selectedClient.nome}</h3>
                        <p>Dívida atual: R$ {selectedClient.divida.toFixed(2)}</p>

                        <input
                            type="text"
                            value={payment}
                            onChange={(e) => {
                                let value = e.target.value.replace(',', '.');
                                if (value === '' || !isNaN(value)) {
                                    setPayment(value);
                                }
                            }}
                            onBlur={() => {
                                setPayment(parseFloat(payment.replace(',', '.')) || 0);
                            }}
                            placeholder="Digite o valor do pagamento"
                        />

                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="">Selecione a forma de pagamento</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">Pix</option>
                        </select>

                        <button onClick={handlePayment}>Confirmar Pagamento</button>
                        <button onClick={() => setPaymentModal(false)}>Cancelar</button>
                    </div>
                </div>
            )}



            {editClientModal && selectedClient && (
                <div id="editClientModal">
                    <div>
                        <h2>Editar Cliente</h2>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault(); // Previne o envio padrão do formulário
                                // Atualiza os dados do cliente na base de dados
                                saveClientData(selectedClient);
                                setEditClientModal(false); // Fecha o modal
                            }}
                        >
                            <label>Nome</label>
                            <input
                                type="text"
                                className="form-control"
                                value={selectedClient.nome}
                                onChange={(e) =>
                                    setSelectedClient({ ...selectedClient, nome: e.target.value })
                                }
                            />
                            <label>Telefone</label>
                            <input
                                type="text"
                                className="form-control"
                                value={selectedClient.telefone}
                                onChange={(e) =>
                                    setSelectedClient({ ...selectedClient, telefone: e.target.value })
                                }
                            />
                            <label>Dívida:</label>
                            <div>
                                <label>Fiado (Dívida Atual: R$ {(Number(selectedClient.divida) || 0).toFixed(2)}
                                    )</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={selectedClient.divida}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(',', '.'); // Permitir uso de vírgula como ponto decimal

                                        // Permitir que o campo fique vazio sem erro
                                        if (value === '' || !isNaN(value)) {
                                            setSelectedClient({ ...selectedClient, divida: value });
                                        }
                                    }}
                                    onBlur={() => {
                                        // Converte para número apenas quando o usuário sai do campo
                                        setSelectedClient({ ...selectedClient, divida: parseFloat(selectedClient.divida) || 0 });
                                    }}
                                />

                            </div>
                            
                            <strong>
                                <div>
                                    <p>Este cliente já gastou: <br />R$ {(selectedClient.totalGasto || 0).toFixed(2)}</p>
                                </div>
                            </strong>

                            <div className="mt-3">
                                <button type="submit" className="btn btn-dark form-control">
                                    Salvar Alterações
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger mt-2"
                                    onClick={() => setEditClientModal(false)} // Fecha o modal
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <button className="btn btn-dark" id="addClient" onClick={handleAddClient}>+</button>

            {addClient &&
                (
                    <div id="addClientContainer">
                        <form id="addClientForm" onSubmit={createClient}>
                            <button type="button" onClick={closeForm} id="closeFormButton">X</button>
                            <input
                                type="text"
                                placeholder="Nome"
                                className="form-control"
                                value={newClient.nome}
                                onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Telefone"
                                className="form-control"
                                value={newClient.telefone}
                                onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Fiado"
                                className="form-control"
                                value={newClient.divida}
                                onChange={(e) => setNewClient({ ...newClient, divida: e.target.value })}
                            />
                            <button type="submit" className="btn btn-dark form-control">Adicionar</button>
                        </form>
                    </div>
                )}

<button onClick={gerarPDF} className="btn btn-primary" style={{ margin: '10px 0' }}>
                GERAR LISTA
            </button>

        </div>
    );
};

export default Clientes;
