# Calculadora Financeira

Uma calculadora de fluxo de caixa avançada para realizar cálculos financeiros como valor presente (PV), valor futuro (FV), prestações (PMT), taxas de juros e períodos.

![Calculadora Financeira](https://github.com/seu-usuario/calculadorafinanceira/raw/main/screenshot.png)

## Funcionalidades

- **Cálculo completo de fluxo de caixa**:
  - Valor Presente (PV)
  - Valor Futuro (FV)
  - Prestações (PMT)
  - Taxa de juros (i)
  - Número de períodos (n)
- **Inversão automática de sinais** para manter coerência financeira
- **Cache de resultados** para melhorar performance
- **Histórico de cálculos** com capacidade para os últimos 10 cálculos
- **Métodos numéricos avançados** como Newton-Raphson para cálculo de taxas
- **Interface responsiva** adaptada para todos os tamanhos de tela
- **Tratamento de casos especiais** em diversos cenários financeiros

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Técnicas de UI/UX modernas
- Métodos matemáticos financeiros

## Como Usar

### Instalação

1. Clone este repositório:
   ```
   git clone https://github.com/seu-usuario/calculadorafinanceira.git
   ```
2. Abra o arquivo `index.html` em qualquer navegador moderno

### Uso Online

Acesse a calculadora diretamente em: [https://seu-usuario.github.io/calculadorafinanceira](https://seu-usuario.github.io/calculadorafinanceira)

### Integração em Outros Sites

Para adicionar esta calculadora ao seu site:

1. Copie o arquivo `index.html`
2. Adapte os estilos conforme necessário
3. Inclua em seu site como uma página completa ou em um iframe

## Guia de Uso

1. **Selecione o valor a calcular** no dropdown
2. **Preencha os campos conhecidos**
3. **Clique em "Calcular"** para obter o resultado
4. Use os botões **+/-** para inverter sinais quando necessário
5. Visualize o **histórico de cálculos** clicando no botão "Histórico"

## Casos de Uso Comuns

### Cálculo de Prestação de Financiamento
- Preencha o Valor Atual com o valor do empréstimo (positivo)
- Defina o número de períodos
- Defina a taxa de juros
- Coloque Valor Futuro = 0
- Selecione "Prestação (PMT)" no dropdown
- Calcule

### Cálculo de Tempo para Acumulação
- Preencha o Valor Atual (investimento inicial)
- Insira a taxa de juros
- Insira o valor da contribuição periódica (PMT)
- Insira o valor futuro desejado
- Selecione "Períodos (n)" no dropdown
- Calcule

## Fundamentos Matemáticos

A calculadora implementa as seguintes fórmulas financeiras:

- **Valor Presente (PV)**: 
  - Com PMT=0: `PV = FV / (1+i)^n`
  - Caso geral: `PV = -PMT * (1-(1+i)^-n)/i - FV*(1+i)^-n`

- **Valor Futuro (FV)**:
  - Com PMT=0: `FV = PV * (1+i)^n`
  - Caso geral: `FV = -PMT * ((1+i)^n-1)/i - PV*(1+i)^n`

- **Métodos Numéricos**:
  - Busca Binária para cálculo de períodos
  - Newton-Raphson para cálculo de taxas

## Estrutura do Projeto

```
calculadorafinanceira/
│
├── index.html         # Arquivo principal contendo HTML, CSS e JavaScript
├── screenshot.png     # Captura de tela da calculadora
└── README.md          # Este arquivo
```

## Melhorias Futuras

- [ ] Separação de código em arquivos distintos (HTML, CSS, JS)
- [ ] Adição de gráficos para visualização
- [ ] Exportação dos resultados em PDF
- [ ] Implementação de funções financeiras adicionais
- [ ] Temas visuais personalizáveis

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Créditos

Desenvolvido originalmente para o site [Cabala e Matemática](https://cabalaematematica.com.br/) como uma ferramenta educacional e prática para cálculos financeiros.

## Contribuições

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

© 2025 Calculadora Financeira | Todos os direitos reservados.
