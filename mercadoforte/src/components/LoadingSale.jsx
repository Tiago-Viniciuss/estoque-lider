import React from 'react'
import { Oval } from 'react-loader-spinner';
import '../styles/LoadingSpinner.css'

const LoadingSale = () => {

  return (
    <div className="loading-container">
        <Oval
          height={80}
          width={80}
          color="rgb(19, 103, 181)"
          wrapperStyle={{}}
          wrapperClass=""
          visible={true}
          ariaLabel='oval-loading'
          secondaryColor="rgb(19, 103, 181)"
          strokeWidth={2}
          strokeWidthSecondary={2}
        />
        <p>Finalizando venda...</p>
      </div>
  )
}

export default LoadingSale