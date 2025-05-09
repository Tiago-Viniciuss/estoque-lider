import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ajuste o caminho se necessário
import { useNavigate } from 'react-router-dom';
import '../styles/Configuracoes.css'; // Criaremos este arquivo CSS

// --- Componente Modal UserModal (sem alterações) ---
const UserModal = ({ user, onClose, onSave, empresaId }) => {
  const [name, setName] = useState(user ? user.nome : '');
  const [email, setEmail] = useState(user ? user.email : '');
  const [role, setRole] = useState(user ? user.role : 'funcionario'); // Exemplo de role
  const [password, setPassword] = useState(''); // Senha só para criação
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    if (!name || !email || (!user && !password)) { // Senha obrigatória na criação
        setError('Preencha todos os campos obrigatórios.');
        setIsSaving(false);
        return;
    }

    try {
      const userData = { nome: name, email: email, role: role };
      if (!user) { // Se for um novo usuário, adiciona a senha (idealmente hasheada no backend)
        // ATENÇÃO: Armazenar senhas em texto plano não é seguro!
        // Idealmente, isso seria tratado por um backend ou Firebase Auth.
        // Para este exemplo, vamos assumir que a senha é necessária apenas para um sistema de login interno.
        userData.password_placeholder = password; // Nome de campo indicando que não é seguro
      }
      await onSave(userData);
      onClose(); // Fecha o modal após salvar
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      setError('Erro ao salvar usuário. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{user ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2>
        {error && <p className="feedback-message error">{error}</p>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="userName">Nome:</label>
            <input
              type="text"
              id="userName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required className='form-control'
            />
          </div>
          <div className="form-group">
            <label htmlFor="userEmail">E-mail:</label>
            <input
              type="email"
              id="userEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required className='form-control'
            />
          </div>
          {!user && (
            <div className="form-group">
              <label htmlFor="userPassword">Senha (Provisória):</label>
              <input
                type="password"
                id="userPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required className='form-control'
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="userRole">Função:</label>
            <select id="userRole" value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="funcionario">Funcionário</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componente Principal Configuracoes ---
const Configuracoes = () => {
  // Estados Dados da Empresa
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  // Estados Gerenciamento de Usuários
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Estados Outras Configurações
  const [permitirFiado, setPermitirFiado] = useState(true); // Valor padrão
  const [impressoraRecibo, setImpressoraRecibo] = useState('');
  const [mensagemRecibo, setMensagemRecibo] = useState('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Estado Geral
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [globalLoading, setGlobalLoading] = useState(true);

  const empresaId = localStorage.getItem('empresaId');
  const navigate = useNavigate();

  // --- Fetch Inicial de Todos os Dados ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!empresaId) {
        console.error('ID da empresa não encontrado no localStorage.');
        setFeedbackMessage('Erro: ID da empresa não encontrado.');
        setGlobalLoading(false);
        return;
      }
      setGlobalLoading(true);
      setFeedbackMessage('');

      try {
        // Fetch Dados da Empresa e Outras Configurações (do mesmo documento)
        const empresaRef = doc(db, 'Empresas', empresaId);
        const empresaDoc = await getDoc(empresaRef);

        if (empresaDoc.exists()) {
          const data = empresaDoc.data();
          // Dados da Empresa
          setCompanyName(data.nome || '');
          setCompanyEmail(data.email || '');
          // Outras Configurações
          setPermitirFiado(data.configuracoes?.permitirFiado ?? true); // Usa ?? para valor padrão
          setImpressoraRecibo(data.configuracoes?.impressoraRecibo || '');
          setMensagemRecibo(data.configuracoes?.mensagemRecibo || '');
        } else {
          setFeedbackMessage('Dados da empresa não encontrados.');
        }
        setIsLoadingCompany(false);
        setIsLoadingSettings(false);

        // Fetch Usuários (subcoleção)
        await fetchUsers();

      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
        setFeedbackMessage('Erro ao carregar configurações.');
        setIsLoadingCompany(false);
        setIsLoadingSettings(false);
        setIsLoadingUsers(false);
      } finally {
        setGlobalLoading(false);
      }
    };

    fetchAllData();
  }, [empresaId]); // Dependência apenas no empresaId

  // --- Funções Dados da Empresa ---
  const handleEditCompanyToggle = () => {
    setIsEditingCompany(!isEditingCompany);
    setFeedbackMessage('');
  };

  const handleSaveCompanyChanges = async (e) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsLoadingCompany(true);
    setFeedbackMessage('Salvando dados da empresa...');
    try {
      const empresaRef = doc(db, 'Empresas', empresaId);
      await updateDoc(empresaRef, { nome: companyName, email: companyEmail });
      setFeedbackMessage('Dados da empresa atualizados com sucesso!');
      setIsEditingCompany(false);
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      setFeedbackMessage('Erro ao salvar dados da empresa.');
    } finally {
      setIsLoadingCompany(false);
    }
  };

  // --- Funções Gerenciamento de Usuários ---
  const fetchUsers = async () => {
    if (!empresaId) return;
    setIsLoadingUsers(true);
    try {
      const usersRef = collection(db, 'Empresas', empresaId, 'Usuarios');
      const querySnapshot = await getDocs(usersRef);
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setFeedbackMessage('Erro ao carregar usuários.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
    setFeedbackMessage('');
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
    setFeedbackMessage('');
  };

  const handleDeleteUser = async (userId) => {
    if (!empresaId) return;
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
        setFeedbackMessage('Excluindo usuário...');
        setIsLoadingUsers(true);
        try {
            const userRef = doc(db, 'Empresas', empresaId, 'Usuarios', userId);
            await deleteDoc(userRef);
            setFeedbackMessage('Usuário excluído com sucesso!');
            fetchUsers();
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            setFeedbackMessage('Erro ao excluir usuário.');
            setIsLoadingUsers(false);
        }
    }
  };

  const handleSaveUser = async (userData) => {
    if (!empresaId) throw new Error('ID da Empresa não encontrado');
    const usersRef = collection(db, 'Empresas', empresaId, 'Usuarios');
    try {
        if (editingUser) {
            const userRef = doc(db, 'Empresas', empresaId, 'Usuarios', editingUser.id);
            await updateDoc(userRef, userData);
            setFeedbackMessage('Usuário atualizado com sucesso!');
        } else {
            // TODO: Adicionar validação de e-mail único antes de adicionar
            await addDoc(usersRef, userData);
            setFeedbackMessage('Usuário adicionado com sucesso!');
        }
        fetchUsers();
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        // Lança o erro para ser pego no modal
        throw error;
    }
  };

  // --- Funções Outras Configurações ---
  const handleEditSettingsToggle = () => {
    setIsEditingSettings(!isEditingSettings);
    setFeedbackMessage('');
  };

  const handleSaveSettingsChanges = async (e) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsLoadingSettings(true);
    setFeedbackMessage('Salvando outras configurações...');
    try {
      const empresaRef = doc(db, 'Empresas', empresaId);
      // Usamos merge: true para não sobrescrever outros campos da empresa
      // e atualizamos dentro de um objeto 'configuracoes'
      await updateDoc(empresaRef, {
        configuracoes: {
          permitirFiado: permitirFiado,
          impressoraRecibo: impressoraRecibo,
          mensagemRecibo: mensagemRecibo
        }
      }, { merge: true }); // Garante que outros campos não sejam perdidos
      setFeedbackMessage('Outras configurações atualizadas com sucesso!');
      setIsEditingSettings(false);
    } catch (error) {
      console.error('Erro ao atualizar outras configurações:', error);
      setFeedbackMessage('Erro ao salvar outras configurações.');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem('empresaId');
    localStorage.removeItem('loginUserName');
    navigate('/');
  };

  // --- Renderização ---
  if (globalLoading) {
    return <div className="loading-container">Carregando configurações...</div>;
  }

  return (
    <div className="configuracoes-container">
      <h1>Configurações</h1>
      {feedbackMessage && <p className={`feedback-message ${feedbackMessage.startsWith('Erro') ? 'error' : 'success'}`}>{feedbackMessage}</p>}

      {/* --- Seção Dados da Empresa --- */}
      <section className="config-section">
        <h2>Dados da Empresa</h2>
        <form onSubmit={handleSaveCompanyChanges} className="config-form">
          <div className="form-group">
            <label htmlFor="companyName">Nome da Empresa:</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              readOnly={!isEditingCompany || isLoadingCompany}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="companyEmail">E-mail da Empresa:</label>
            <input
              type="email"
              id="companyEmail"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              readOnly={!isEditingCompany || isLoadingCompany}
              required
            />
          </div>
          {isEditingCompany ? (
            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={isLoadingCompany}>
                {isLoadingCompany ? 'Salvando...' : 'Salvar Empresa'}
              </button>
              <button type="button" className="btn-cancel" onClick={handleEditCompanyToggle} disabled={isLoadingCompany}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="btn-edit" onClick={handleEditCompanyToggle} disabled={isLoadingCompany}>
              Editar Dados da Empresa
            </button>
          )}
        </form>
      </section>

      {/* --- Seção Gerenciamento de Usuários --- */}
      <section className="config-section user-management-section">
        <h3>Gerenciamento de Usuários</h3>
        {isLoadingUsers ? (
          <p>Carregando usuários...</p>
        ) : (
          <>
            <ul className="user-list">
              {users.length > 0 ? (
                users.map(user => (
                  <li key={user.id}>
                    <div className="user-info">
                      <span>{user.nome} ({user.role || 'N/A'})</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="user-actions">
                      <button onClick={() => handleEditUser(user)} title="Editar" disabled={isLoadingUsers}>✏️</button>
                      <button onClick={() => handleDeleteUser(user.id)} title="Excluir" disabled={isLoadingUsers}>🗑️</button>
                    </div>
                  </li>
                ))
              ) : (
                <p>Nenhum usuário cadastrado.</p>
              )}
            </ul>
            <button onClick={handleAddUser} className="btn-add-user" disabled={isLoadingUsers}>
              Adicionar Novo Usuário
            </button>
          </>
        )}
      </section>

      {/* Modal para Adicionar/Editar Usuário */} 
      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
          empresaId={empresaId}
        />
      )}

      {/* --- Seção Outras Configurações ---
      <section className="config-section other-settings-section">
        <h3>Outras Configurações</h3>
         <form onSubmit={handleSaveSettingsChanges} className="config-form">
            <div className="form-group checkbox-group">
                <input
                    type="checkbox"
                    id="permitirFiado"
                    checked={permitirFiado}
                    onChange={(e) => setPermitirFiado(e.target.checked)}
                    disabled={!isEditingSettings || isLoadingSettings}
                />
                <label htmlFor="permitirFiado"> Permitir Vendas Fiado</label>
            </div>
            <div className="form-group">
                <label htmlFor="impressoraRecibo">Nome da Impressora de Recibos:</label>
                <input
                    type="text"
                    id="impressoraRecibo"
                    value={impressoraRecibo}
                    onChange={(e) => setImpressoraRecibo(e.target.value)}
                    placeholder="Ex: EPSON TM-T20" 
                    readOnly={!isEditingSettings || isLoadingSettings}
                />
            </div>
             <div className="form-group">
                <label htmlFor="mensagemRecibo">Mensagem Adicional no Recibo:</label>
                <textarea
                    id="mensagemRecibo"
                    value={mensagemRecibo}
                    onChange={(e) => setMensagemRecibo(e.target.value)}
                    rows="3"
                    placeholder="Ex: Obrigado pela preferência! Volte sempre."
                    readOnly={!isEditingSettings || isLoadingSettings}
                />
            </div>
            {isEditingSettings ? (
                <div className="form-actions">
                <button type="submit" className="btn-save" disabled={isLoadingSettings}>
                    {isLoadingSettings ? 'Salvando...' : 'Salvar Configurações'}
                </button>
                <button type="button" className="btn-cancel" onClick={handleEditSettingsToggle} disabled={isLoadingSettings}>
                    Cancelar
                </button>
                </div>
            ) : (
                <button type="button" className="btn-edit" onClick={handleEditSettingsToggle} disabled={isLoadingSettings}>
                Editar Configurações
                </button>
            )}
        </form>
      </section> */}
      

      {/* --- Botão de Sair --- */}
      <section className="config-section logout-section">
        <button onClick={handleLogout} className="btn-logout">
          Sair da Conta
        </button>
      </section>
    </div>
  );
};

export default Configuracoes;

