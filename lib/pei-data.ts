// PEI card data — ported verbatim from samba-paper v1 (DocumentoEditor.tsx)

export type PeiCard = { id: number; nome: string; desc: string }

export const DIAGNOSTICO_FUNCIONAL: { id: number; nome: string; necessidades: string[] }[] = [
  { id: 1, nome: 'Comunicação e Linguagem', necessidades: [
    'Dificuldade na expressão oral',
    'Dificuldade na compreensão de enunciados',
    'Ausência ou limitação da fala',
    'Necessidade de CAA (Comunicação Alternativa)',
    'Dificuldade na leitura',
    'Dificuldade na escrita',
  ]},
  { id: 2, nome: 'Cognição e Aprendizagem', necessidades: [
    'Dificuldade na abstração',
    'Comprometimento da memória de trabalho',
    'Lentificação no processamento',
    'Dificuldade na resolução de problemas',
    'Necessidade de adaptação curricular',
    'Dificuldade na generalização',
  ]},
  { id: 3, nome: 'Interação Social', necessidades: [
    'Dificuldade em iniciar interações',
    'Preferência por atividades solitárias',
    'Dificuldade em compreender regras sociais',
    'Dificuldade com trabalho em grupo',
    'Dificuldade em manter conversas',
  ]},
  { id: 4, nome: 'Comportamento e Autorregulação', necessidades: [
    'Comportamentos repetitivos / estereotipias',
    'Dificuldade com mudanças de rotina',
    'Crises emocionais frequentes',
    'Impulsividade',
    'Dificuldade em esperar a vez',
    'Comportamentos desafiadores',
  ]},
  { id: 5, nome: 'Motricidade e Coordenação', necessidades: [
    'Dificuldade na escrita manual',
    'Comprometimento da motricidade grossa',
    'Dificuldade em manusear materiais',
    'Baixo tônus muscular',
    'Dificuldade na coordenação vísuo-motora',
  ]},
  { id: 6, nome: 'Processamento Sensorial', necessidades: [
    'Hipersensibilidade sonora',
    'Hipersensibilidade tátil',
    'Hipersensibilidade visual',
    'Hiposensibilidade / busca de estímulos',
    'Dificuldade com ambientes movimentados',
  ]},
  { id: 7, nome: 'Autonomia e Independência', necessidades: [
    'Necessidade de apoio no autocuidado',
    'Dificuldade na organização pessoal',
    'Dependência para iniciar tarefas',
    'Dificuldade na gestão do tempo',
    'Necessidade de supervisão constante',
  ]},
  { id: 8, nome: 'Atenção e Concentração', necessidades: [
    'Dificuldade em manter atenção sustentada',
    'Alta distratibilidade',
    'Hiperatividade motora',
    'Impulsividade nas respostas',
    'Dificuldade em concluir tarefas',
  ]},
]

export const PEI_OBJETIVOS: PeiCard[] = [
  { id:  1, nome: 'Ampliar comunicação funcional',           desc: 'Desenvolver estratégias de comunicação oral, escrita ou alternativa.' },
  { id:  2, nome: 'Desenvolver autonomia',                   desc: 'Ampliar independência nas atividades escolares e cotidianas.' },
  { id:  3, nome: 'Aprimorar interação com pares',           desc: 'Estimular participação em atividades coletivas e relações interpessoais.' },
  { id:  4, nome: 'Ampliar atenção e concentração',          desc: 'Aumentar o tempo e qualidade de engajamento nas atividades propostas.' },
  { id:  5, nome: 'Desenvolver habilidades acadêmicas',      desc: 'Trabalhar leitura, escrita e matemática em nível funcional adaptado.' },
  { id:  6, nome: 'Autorregulação emocional',                desc: 'Identificar e gerenciar emoções e comportamentos em contexto escolar.' },
  { id:  7, nome: 'Aprimorar motricidade fina',              desc: 'Desenvolver precisão e coordenação para atividades de escrita e manipulação.' },
  { id:  8, nome: 'Participar de atividades curriculares',   desc: 'Acesso ao currículo com adaptações e apoios adequados.' },
  { id:  9, nome: 'Desenvolver habilidades socioemocionais', desc: 'Trabalhar empatia, cooperação, resolução de conflitos e autoconhecimento.' },
  { id: 10, nome: 'Fortalecer autoestima e autoconceito',    desc: 'Valorizar potencialidades e desenvolver percepção positiva de si mesmo.' },
]

export const PEI_ESTRAT_PEDAGOGICAS: PeiCard[] = [
  { id: 101, nome: 'Explicar o conteúdo em partes menores',             desc: 'Fragmentar conteúdos extensos em etapas menores e progressivas, favorecendo compreensão gradual e redução da sobrecarga cognitiva.' },
  { id: 102, nome: 'Usar exemplos concretos e do cotidiano',            desc: 'Relacionar conceitos escolares a experiências reais e contextos familiares ao estudante para ampliar significado e compreensão.' },
  { id: 103, nome: 'Oferecer mais tempo para realizar tarefas',         desc: 'Garantir tempo ampliado para leitura, organização do pensamento, execução e revisão das atividades.' },
  { id: 104, nome: 'Fazer mediação nas atividades em grupo',            desc: 'Auxiliar a participação do estudante nas interações coletivas, favorecendo comunicação, cooperação e pertencimento.' },
  { id: 105, nome: 'Retomar conteúdos sempre que necessário',           desc: 'Revisitar habilidades e conceitos previamente trabalhados para consolidação da aprendizagem e recuperação contínua.' },
  { id: 106, nome: 'Garantir previsibilidade (rotina visual, passo a passo)', desc: 'Organizar a rotina com apoio visual e antecipação das atividades, reduzindo ansiedade e favorecendo autonomia.' },
  { id: 107, nome: 'Dar instruções claras com apoio visual',            desc: 'Apresentar orientações curtas, organizadas e acompanhadas de exemplos, imagens ou demonstrações práticas.' },
  { id: 108, nome: 'Antecipar mudanças de rotina e avaliações',         desc: 'Informar previamente alterações na rotina, avaliações ou eventos escolares para favorecer adaptação emocional e organizacional.' },
  { id: 109, nome: 'Utilizar múltiplas formas de apresentação',         desc: 'Apresentar os conteúdos por diferentes meios: oral, visual, concreto, digital e prático.' },
  { id: 110, nome: 'Relacionar conteúdos aos conhecimentos prévios',    desc: 'Ativar aprendizagens anteriores como ponto de partida para novos conceitos e habilidades.' },
  { id: 111, nome: 'Utilizar organizadores gráficos e mapas mentais',   desc: 'Favorecer organização das informações por meio de recursos visuais estruturados.' },
  { id: 112, nome: 'Estabelecer objetivos curtos e metas progressivas', desc: 'Dividir tarefas em metas menores, alcançáveis e acompanhadas continuamente.' },
  { id: 113, nome: 'Favorecer aprendizagem colaborativa com pares',     desc: 'Promover interação com colegas que auxiliem na realização das atividades e na participação social.' },
  { id: 114, nome: 'Realizar pausas planejadas em atividades extensas', desc: 'Permitir intervalos organizados para recuperação atencional e regulação emocional.' },
  { id: 115, nome: 'Estimular autonomia por rotinas estruturadas',      desc: 'Favorecer independência gradual na organização de materiais, tarefas e tomada de decisões.' },
  { id: 116, nome: 'Utilizar reforço positivo e devolutivas imediatas', desc: 'Valorizar avanços e oferecer feedback rápido para fortalecer engajamento e autoestima acadêmica.' },
  { id: 117, nome: 'Flexibilizar a sequência didática ao ritmo do aluno', desc: 'Adaptar o percurso pedagógico respeitando tempo, necessidade e formas de aprendizagem.' },
  { id: 118, nome: 'Favorecer participação por metodologias investigativas', desc: 'Estimular protagonismo em pesquisas, resolução de problemas e construção colaborativa do conhecimento.' },
  { id: 119, nome: 'Apresentar modelos resolvidos antes da execução',   desc: 'Demonstrar exemplos completos antes da execução independente da atividade.' },
  { id: 120, nome: 'Utilizar linguagem acessível ao nível de compreensão', desc: 'Adequar vocabulário, estrutura das frases e complexidade comunicativa às necessidades do estudante.' },
]

export const PEI_INTERVENCOES: PeiCard[] = [
  { id: 201, nome: 'Apoio individual em atividades mais complexas',     desc: 'Realizar acompanhamento mais próximo em tarefas que exijam maior abstração, organização ou autonomia.' },
  { id: 202, nome: 'Adaptação de quantidade',                           desc: 'Reduzir número de exercícios ou questões mantendo os objetivos essenciais de aprendizagem.' },
  { id: 203, nome: 'Adaptação de complexidade',                         desc: 'Simplificar estrutura ou linguagem da atividade preservando a habilidade curricular principal.' },
  { id: 204, nome: 'Ajuste da forma de participação',                   desc: 'Permitir diferentes formas de resposta: oral, escrita, digital, visual ou por comunicação alternativa.' },
  { id: 205, nome: 'Leitura compartilhada e mediação de enunciados',    desc: 'Auxiliar compreensão leitora por meio de leitura guiada e explicação dos comandos.' },
  { id: 206, nome: 'Fragmentação de atividades longas em etapas',       desc: 'Dividir tarefas extensas em pequenas partes com acompanhamento progressivo.' },
  { id: 207, nome: 'Oferta de pistas visuais ou palavras-chave',        desc: 'Disponibilizar apoios que auxiliem organização do pensamento e recuperação de informações.' },
  { id: 208, nome: 'Revisão mediada antes da entrega final',            desc: 'Acompanhar conferência da atividade para identificação de erros e reorganização das respostas.' },
  { id: 209, nome: 'Ampliação do tempo em avaliações',                  desc: 'Garantir tempo adicional para processamento, interpretação e registro das respostas.' },
  { id: 210, nome: 'Substituição parcial da escrita extensa',           desc: 'Permitir registros alternativos quando houver dificuldade significativa na produção escrita.' },
  { id: 211, nome: 'Avaliação diferenciada pelo percurso',              desc: 'Valorizar evolução individual, participação e desenvolvimento processual do estudante.' },
  { id: 212, nome: 'Redução de estímulos distratores em avaliações',    desc: 'Organizar ambiente mais tranquilo e com menor interferência sensorial.' },
  { id: 213, nome: 'Apoio na organização de materiais e tarefas',       desc: 'Auxiliar planejamento, gerenciamento de tempo e organização escolar.' },
  { id: 214, nome: 'Mediação verbal para manutenção do foco',           desc: 'Realizar lembretes e direcionamentos durante atividades para favorecer permanência na tarefa.' },
  { id: 215, nome: 'Reorientação frequente em atividades longas',       desc: 'Retomar instruções e objetivos sempre que necessário durante a execução.' },
  { id: 216, nome: 'Intervenção para habilidades socioemocionais',      desc: 'Promover estratégias de convivência, autocontrole emocional e interação social.' },
  { id: 217, nome: 'Adaptação do formato avaliativo',                   desc: 'Modificar forma de aplicação da avaliação respeitando necessidades específicas.' },
  { id: 218, nome: 'Priorização de habilidades essenciais do currículo', desc: 'Focar nas aprendizagens fundamentais previstas para o ano/série.' },
  { id: 219, nome: 'Planejamento articulado entre equipe e AEE',        desc: 'Promover alinhamento entre professores, especialistas e gestão escolar.' },
  { id: 220, nome: 'Monitoramento contínuo da evolução pedagógica',     desc: 'Registrar avanços, dificuldades e estratégias efetivas para acompanhamento sistemático.' },
]

export const PEI_RECURSOS: PeiCard[] = [
  { id: 301, nome: 'Material ampliado, contrastes ou fontes acessíveis', desc: 'Adaptar tamanho, contraste e legibilidade dos materiais impressos ou digitais.' },
  { id: 302, nome: 'Figuras, pictogramas ou comunicação alternativa',   desc: 'Utilizar apoios visuais e sistemas alternativos de comunicação.' },
  { id: 303, nome: 'Tablet ou computador para registro de respostas',   desc: 'Permitir recursos digitais para facilitar escrita, organização e participação.' },
  { id: 304, nome: 'Softwares de leitura e síntese de voz',             desc: 'Disponibilizar ferramentas digitais de apoio à leitura e produção textual.' },
  { id: 305, nome: 'Recursos de comunicação suplementar (CSA)',         desc: 'Utilizar pranchas, aplicativos ou símbolos para apoio à comunicação funcional.' },
  { id: 306, nome: 'Teclado ampliado, mouse adaptado ou tecnologia assistiva', desc: 'Disponibilizar recursos adaptados para acesso físico e digital.' },
  { id: 307, nome: 'Áudio para textos e instruções',                    desc: 'Oferecer materiais em formato sonoro para favorecer compreensão.' },
  { id: 308, nome: 'Régua de leitura ou guia visual',                   desc: 'Auxiliar acompanhamento visual da leitura e foco atencional.' },
  { id: 309, nome: 'Calendários e sequências ilustradas permanentes',   desc: 'Organizar rotinas e tarefas por meio de referências visuais contínuas.' },
  { id: 310, nome: 'Materiais manipuláveis e concretos',                desc: 'Favorecer compreensão por meio da experimentação prática e visualização concreta.' },
  { id: 311, nome: 'Ambiente com redução de estímulos sensoriais',      desc: 'Minimizar ruídos, excesso visual ou fatores que dificultem concentração.' },
  { id: 312, nome: 'Recursos de autorregulação sensorial',              desc: 'Disponibilizar estratégias e recursos para organização emocional e sensorial.' },
  { id: 313, nome: 'Disponibilização antecipada de conteúdos e roteiros', desc: 'Permitir acesso prévio aos materiais para favorecer preparação e compreensão.' },
  { id: 314, nome: 'Vídeos legendados e materiais multimodais',         desc: 'Oferecer conteúdos acessíveis em diferentes formatos comunicacionais.' },
  { id: 315, nome: 'Adaptação do mobiliário ou posicionamento em sala', desc: 'Organizar espaço físico conforme necessidade funcional e pedagógica.' },
  { id: 316, nome: 'Recursos digitais interativos e jogos pedagógicos', desc: 'Utilizar plataformas, jogos pedagógicos e ferramentas digitais acessíveis.' },
]

export const PEI_AVALIACAO: PeiCard[] = [
  { id:  1, nome: 'Observação sistemática',        desc: 'Registro estruturado do desempenho e comportamentos em diferentes situações.' },
  { id:  2, nome: 'Portfólio de atividades',       desc: 'Coleção de produções do aluno ao longo do bimestre.' },
  { id:  3, nome: 'Registro fotográfico / vídeo',  desc: 'Documentação visual do progresso e das atividades realizadas.' },
  { id:  4, nome: 'Avaliação descritiva',          desc: 'Relatório narrativo sobre o desenvolvimento do aluno.' },
  { id:  5, nome: 'Checklists de habilidades',     desc: 'Listas de verificação de objetivos e habilidades esperadas.' },
  { id:  6, nome: 'Avaliação em contexto natural', desc: 'Observação nas situações reais de aprendizagem e convivência.' },
  { id:  7, nome: 'Diálogo com a família',         desc: 'Retorno periódico com responsáveis sobre o desenvolvimento.' },
  { id:  8, nome: 'Autoavaliação do aluno',        desc: 'Quando possível, envolvimento do aluno na avaliação do próprio progresso.' },
  { id:  9, nome: 'Reunião multiprofissional',     desc: 'Discussão com todos os profissionais envolvidos no atendimento.' },
  { id: 10, nome: 'Comparação entre bimestres',    desc: 'Análise da evolução ao longo dos bimestres para ajuste do plano.' },
]

export const PEI_LAWS = [
  { code: 'PNEE/2008',          desc: 'Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva — MEC/SEESP' },
  { code: 'Lei 13.146/2015',    desc: 'LBI — Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência)' },
  { code: 'Lei 9.394/1996',     desc: 'LDB — Lei de Diretrizes e Bases da Educação Nacional, Art. 58–60 (Educação Especial)' },
  { code: 'Lei 8.069/1990',     desc: 'ECA — Estatuto da Criança e do Adolescente, Art. 53–55 (Direito à Educação)' },
  { code: 'Decreto 7.611/2011', desc: 'Dispõe sobre Educação Especial e o Atendimento Educacional Especializado — AEE' },
  { code: 'Res. CNE/CEB 4/2009',desc: 'Diretrizes Operacionais para o AEE na Educação Básica, modalidade Educação Especial' },
  { code: 'DUA',                desc: 'Desenho Universal para Aprendizagem — princípios de acessibilidade pedagógica, comunicacional e metodológica' },
  { code: 'Currículo Paulista', desc: 'Currículo Paulista (SEDUC-SP) — orientações para flexibilização e adaptação curricular' },
  { code: 'Delib. CEE 177/2023',desc: 'Deliberação CEE-SP sobre Educação Especial e Inclusão Escolar no Estado de São Paulo' },
  { code: 'Res. SE 68/2017',    desc: 'Resolução SE-SP — apoio à escolarização de alunos com deficiência, TGD e altas habilidades' },
  { code: 'Nota Técnica 04/2014',desc: 'SEESP/MEC — Orientações sobre documentação das necessidades educacionais especiais' },
]

export const PEI_PURPOSES = [
  'Evitar termos excessivamente genéricos',
  'Proteger juridicamente o documento',
  'Demonstrar intencionalidade pedagógica',
  'Permitir parametrização em sistemas de gestão',
  'Favorecer futura geração de relatórios e planos individualizados',
]

// Extrai { year, sec } de "3D", "3ªD", "3º D", "9C" → { year:'3', sec:'D' }
export function parseClassCode(s: string): { year: string; sec: string } | null {
  const clean = s.replace(/[ªº°]/g, '').trim()
  const m = clean.match(/^(\d+).*?([A-Za-z])$/)
  if (!m) return null
  return { year: m[1], sec: m[2].toUpperCase() }
}
