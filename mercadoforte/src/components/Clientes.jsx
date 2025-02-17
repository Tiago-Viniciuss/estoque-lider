import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from './LoadingSpinner';
import '../styles/Clientes.css';

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
    const empresaId = localStorage.getItem('empresaId');

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
                const clientDivida = clientData.divida || 0;
                const sales = salesByName[clientName] || [];

                clientsData.push({
                    telefone: clientPhone,
                    nome: clientName,
                    comprasFeitas: sales.length, // Número de vendas por cliente
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
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredClients.map((client, index) => (
                        <tr key={index}>
                            <td className='openClientModal'
                                onClick={() => {
                                    setSelectedClient(client); // Define o cliente selecionado
                                    openEditingModal(client); // Abre o modal de edição
                                }}
                            >
                                {client.nome}
                            </td>
                            <td>{client.telefone}</td>
                            <td>{client.comprasFeitas}</td>
                            <td>{client.divida.toFixed(2)}</td>
                            <td>
                                <button
                                    className="btn btn-danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client); // Deleta o cliente
                                    }}
                                >
                                    Deletar
                                </button>
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
                            <label>Fiado (Dívida Atual: {selectedClient.divida.toFixed(2)})</label>
                            <input
                                type="number"
                                className="form-control"
                                value={selectedClient.divida}
                                onChange={(e) =>
                                    setSelectedClient({
                                        ...selectedClient,
                                        divida: parseFloat(e.target.value),
                                    })
                                }
                            />
                            <small>Insira "0" para quitar a dívida.</small>
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
            {addClient && (
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

        </div>
    );
};

export default Clientes;
