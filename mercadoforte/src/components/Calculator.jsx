import React, { useState } from 'react';

const Calculator = ({ initialTotal, onTotalUpdate }) => {
  const [input, setInput] = useState(initialTotal.toString());

  const handleClick = (value) => {
    if (value === '=') {
      try {
        const result = eval(input); // Evite `eval` em produção
        setInput(result.toString());
        onTotalUpdate(result); // Atualiza o total no componente pai
      } catch {
        setInput('Error');
      }
    } else if (value === 'C') {
      setInput('0');
    } else {
      setInput(input === '0' ? value : input + value);
    }
  };

  return (
    <div style={{ maxWidth: '200px', margin: 'auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '10px', border: '1px solid black', padding: '10px' }}>
        {input || '0'}
      </div>
      <div>
        {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((value) => (
          <button
            key={value}
            onClick={() => handleClick(value)}
            style={{ width: '45px', height: '45px', margin: '2px' }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calculator;
