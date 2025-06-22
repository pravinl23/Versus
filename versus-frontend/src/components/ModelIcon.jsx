import React from 'react'

// Component to generate authentic company-style icons for each AI model
const ModelIcon = ({ model, size = 'normal' }) => {
  const isLarge = size === 'large'
  const containerClass = isLarge ? 'model-icon-large' : 'model-icon-normal'
  
  // Get company colors and styles
  const getCompanyStyle = () => {
    const styles = {
      'OpenAI': {
        background: '#000000',
        color: '#00D9FF',
        symbol: 'OpenAI',
        fontSize: isLarge ? '1.2rem' : '0.8rem',
        fontWeight: 'bold'
      },
      'Anthropic': {
        background: '#D4A574',
        color: '#000000',
        symbol: 'Claude',
        fontSize: isLarge ? '1.2rem' : '0.8rem',
        fontWeight: 'bold'
      },
      'Google': {
        background: '#FFFFFF',
        color: '#4285F4',
        symbol: 'G',
        fontSize: isLarge ? '3rem' : '2rem',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        multicolor: true
      },
      'Meta': {
        background: '#0668E1',
        color: '#FFFFFF',
        symbol: 'Meta',
        fontSize: isLarge ? '1.4rem' : '1rem',
        fontWeight: 'bold'
      },
      'Mistral': {
        background: '#F7931E',
        color: '#000000',
        symbol: 'M',
        fontSize: isLarge ? '3rem' : '2rem',
        fontWeight: 'bold'
      },
      'Cohere': {
        background: '#39E5B1',
        color: '#000000',
        symbol: 'C',
        fontSize: isLarge ? '3rem' : '2rem',
        fontWeight: 'bold'
      },
      'Microsoft': {
        background: '#FFFFFF',
        color: '#0078D4',
        symbol: '⬜',
        fontSize: isLarge ? '2.5rem' : '1.8rem',
        isGrid: true
      },
      'Alibaba': {
        background: '#FF6A00',
        color: '#FFFFFF',
        symbol: '阿里',
        fontSize: isLarge ? '1.8rem' : '1.2rem',
        fontWeight: 'bold'
      },
      'xAI': {
        background: '#000000',
        color: '#FFFFFF',
        symbol: 'X',
        fontSize: isLarge ? '3rem' : '2rem',
        fontWeight: 'bold',
        fontFamily: 'Arial Black, sans-serif'
      },
      'DeepSeek': {
        background: '#6B46C1',
        color: '#FFFFFF',
        symbol: 'DS',
        fontSize: isLarge ? '2rem' : '1.4rem',
        fontWeight: 'bold'
      },
      'Databricks': {
        background: '#FF3621',
        color: '#FFFFFF',
        symbol: 'DB',
        fontSize: isLarge ? '2rem' : '1.4rem',
        fontWeight: 'bold'
      },
      'AI21': {
        background: '#6366F1',
        color: '#FFFFFF',
        symbol: 'AI21',
        fontSize: isLarge ? '1.4rem' : '1rem',
        fontWeight: 'bold'
      },
      '01.AI': {
        background: '#10B981',
        color: '#FFFFFF',
        symbol: '01',
        fontSize: isLarge ? '2rem' : '1.4rem',
        fontWeight: 'bold'
      },
      '???': {
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#000000',
        symbol: '?',
        fontSize: isLarge ? '3rem' : '2rem',
        fontWeight: 'bold',
        isRandom: true
      }
    }
    
    return styles[model.provider] || {
      background: '#6B7280',
      color: '#FFFFFF',
      symbol: model.provider.substring(0, 2).toUpperCase(),
      fontSize: isLarge ? '2rem' : '1.4rem',
      fontWeight: 'bold'
    }
  }

  const companyStyle = getCompanyStyle()

  // Special handling for specific models
  const getModelSpecificSymbol = () => {
    if (model.isRandom) return '?'
    
    // Model-specific overrides
    const modelSymbols = {
      'gpt-4o': 'GPT-4o',
      'gpt-4-turbo': 'GPT-4T',
      'gpt-3.5-turbo': 'GPT-3.5',
      'claude-3-opus': 'Opus',
      'claude-3-sonnet': 'Sonnet',
      'claude-3-haiku': 'Haiku',
      'gemini-1.5-pro': 'Gemini Pro',
      'gemini-1.5-flash': 'Gemini',
      'phi-3-medium': 'Φ-3',
      'phi-3-mini': 'Φ-3m'
    }
    
    return modelSymbols[model.id] || companyStyle.symbol
  }

  // Render Google's multicolor G
  const renderGoogleG = () => {
    if (companyStyle.multicolor && model.provider === 'Google') {
      return (
        <div style={{ position: 'relative', fontSize: companyStyle.fontSize }}>
          <span style={{ color: '#4285F4' }}>G</span>
        </div>
      )
    }
    return null
  }

  // Render Microsoft's grid
  const renderMicrosoftGrid = () => {
    if (companyStyle.isGrid && model.provider === 'Microsoft') {
      return (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          width: isLarge ? '40px' : '30px',
          height: isLarge ? '40px' : '30px'
        }}>
          <div style={{ background: '#F25022' }}></div>
          <div style={{ background: '#7FBA00' }}></div>
          <div style={{ background: '#00A4EF' }}></div>
          <div style={{ background: '#FFB900' }}></div>
        </div>
      )
    }
    return null
  }

  const styles = {
    container: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: companyStyle.background,
      position: 'relative',
      overflow: 'hidden'
    },
    symbol: {
      fontSize: companyStyle.fontSize,
      fontWeight: companyStyle.fontWeight || 'bold',
      color: companyStyle.color,
      fontFamily: companyStyle.fontFamily || 'Inter, sans-serif',
      letterSpacing: '-0.02em',
      textAlign: 'center',
      lineHeight: 1
    }
  }

  return (
    <div style={styles.container} className={containerClass}>
      {companyStyle.isGrid ? (
        renderMicrosoftGrid()
      ) : companyStyle.multicolor ? (
        renderGoogleG()
      ) : (
        <div style={styles.symbol}>
          {getModelSpecificSymbol()}
        </div>
      )}
    </div>
  )
}

export default ModelIcon 