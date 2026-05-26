export const getSignupEmailTemplate = (user: string) => `
<!doctype html>
<html>
  <body>
    <div
      style='background-color:#D4D4D4;color:#242424;font-family:ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold", Calibri, source-sans-pro, sans-serif;font-size:16px;font-weight:400;letter-spacing:0.15008px;line-height:1.5;margin:0;padding:32px 0;min-height:100%;width:100%'
    >
      <table
        align="center"
        width="100%"
        style="margin:0 auto;max-width:600px;background-color:#FFFFFF;border-radius:16px"
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
      >
        <tbody>
          <tr style="width:100%">
            <td>
              <div style="background-color:#19235a;padding:0px 0px 0px 0px">
                <table
                  align="center"
                  width="100%"
                  cellpadding="0"
                  border="0"
                  style="table-layout:fixed;border-collapse:collapse"
                >
                  <tbody style="width:100%">
                    <tr style="width:100%">
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:0;width:100px"
                      >
                        <div style="padding:8px 8px 8px 8px;text-align:center">
                          <a
                            href="https://bolaocopa.omegafox.me/"
                            style="text-decoration:none"
                            target="_blank"
                            ><img
                              alt="Link Bolão da Copa"
                              src="https://assets.omegafox.me/copa/misc/taca.png"
                              height="60"
                              style="height:60px;outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%"
                          /></a>
                        </div>
                      </td>
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:0"
                      >
                        <div
                          style="color:#f4b303;font-size:24px;font-weight:bold;text-align:left;padding:0px 0px 0px 0px"
                        >
                          Bolão da Copa 2026
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="background-color:#2b5f39;padding:0px 0px 0px 0px">
                <div style="padding:0px 24px 0px 24px">
                  <div style="height:16px"></div>
                </div>
              </div>
              <div style="background-color:#f4b303;padding:0px 24px 0px 24px">
                <div style="height:8px"></div>
              </div>
              <div style="padding:0px 24px 0px 24px">
                <div style="height:8px"></div>
              </div>
              <h3
                style="color:#284ea0;font-weight:bold;margin:0;font-size:20px;padding:16px 24px 16px 24px"
              >
                Olá ${user} 👋,
              </h3>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Bem-vindo ao Bolão da Copa 2026! Aqui, você vai poder apostar em
                todos os jogos (fase de grupos e eliminatórias) para acumular
                pontos ao longo da competição e, com um pouquinho de sorte,
                terminar entre os premiados!
              </div>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Além de apostar nos jogos, também temos apostas extras onde você
                poderá exercer a futurologia nas seguintes categorias: seleção
                campeã, seleção com a melhor defesa (fase de grupos), seleção
                com o melhor ataque (fase de grupos), artilheiro da competição,
                e melhor jogador da Copa!
              </div>
              <div style="padding:16px 0px 16px 0px">
                <hr
                  style="width:100%;border:none;border-top:1px solid #CCCCCC;margin:0"
                />
              </div>
              <h3
                style="color:#284ea0;font-weight:bold;margin:0;font-size:20px;padding:16px 24px 16px 24px"
              >
                Importante!
              </h3>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Seu cadastro já foi feito mas, para iniciar suas apostas, é
                necessário efetuar o pagamento da inscrição.
              </div>
              <div
                style="background-color:#F5F5F5;font-weight:bold;padding:16px 24px 0px 24px"
              >
                🇧🇷 PIX Copia &amp; Cola
              </div>
              <div
                style="background-color:#F5F5F5;font-size:10px;font-weight:normal;text-align:left;padding:16px 12px 16px 12px"
              >
                00020126550014BR.GOV.BCB.PIX0111395825028940218Bolão da Copa
                20265204000053039865406100.005802BR5923NELSON GIMENEZ DA
                MOTTA6009SAO PAULO62170513BolaoCopa20266304F822
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:bold;padding:16px 24px 0px 24px"
              >
                🇧🇷 PIX
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                395.825.028-94
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                Valor: R$100,00
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 16px 24px"
              >
                Nelson Gimenez da Motta
              </div>
              <div
                style="background-color:#F5F5F5;font-weight:bold;padding:16px 24px 0px 24px"
              >
                🇧🇷 PIX QR Code
              </div>
              <div
                style="padding:16px 24px 16px 24px;background-color:#F5F5F5;text-align:center"
              >
                <img
                  alt="PIX QR Code"
                  src="https://assets.omegafox.me/copa/misc/qr-code.png"
                  width="200"
                  style="width:200px;outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%"
                />
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:bold;padding:16px 24px 0px 24px"
              >
                🇵🇹 MB Way
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                916 166 514
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                Valor: €20.00
              </div>
              <div
                style="background-color:#E5E5E5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                Felipe Zanon do Nascimento
              </div>
              <div
                style="background-color:#F5F5F5;font-weight:bold;padding:16px 24px 0px 24px"
              >
                🌏 PayPal
              </div>
              <div
                style="background-color:#F5F5F5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                felipe@omegafox.me
              </div>
              <div
                style="background-color:#F5F5F5;font-weight:normal;padding:0px 24px 0px 24px"
              >
                Valor: $25.00
              </div>
              <div style="font-weight:normal;padding:16px 24px 0px 24px">
                Após pagamento, responda a esse email com o comprovante.
              </div>
              <div style="font-weight:normal;padding:0px 24px 0px 24px">
                Clique no botão abaixo para maiores informações:
              </div>
              <div style="padding:16px 24px 24px 24px">
                <a
                  href="https://bolaocopa.omegafox.me/regras?section=inscricoes"
                  style="color:#FFFFFF;font-size:14px;font-weight:bold;background-color:#284ea0;border-radius:4px;display:inline-block;padding:12px 20px;text-decoration:none"
                  target="_blank"
                  ><span
                    ><!--[if mso
                      ]><i
                        style="letter-spacing: 20px;mso-font-width:-100%;mso-text-raise:30"
                        hidden
                        >&nbsp;</i
                      ><!
                    [endif]--></span
                  ><span>Regras - Inscrição</span
                  ><span
                    ><!--[if mso
                      ]><i
                        style="letter-spacing: 20px;mso-font-width:-100%"
                        hidden
                        >&nbsp;</i
                      ><!
                    [endif]--></span
                  ></a
                >
              </div>
              <div style="font-weight:normal;padding:0px 24px 16px 24px">
                Se você já efetuou o pagamento, aguarde só mais um pouquinho que
                um dos administradores vai liberar a sua conta para apostas.
              </div>
              <div style="padding:16px 0px 16px 0px">
                <hr
                  style="width:100%;border:none;border-top:1px solid #CCCCCC;margin:0"
                />
              </div>
              <h3
                style="color:#284ea0;font-weight:bold;margin:0;font-size:20px;padding:16px 24px 16px 24px"
              >
                Tudo pronto?
              </h3>
              <div style="font-weight:normal;padding:16px 24px 16px 24px">
                Se sua conta já foi liberada para fazer suas apostas, agora é
                fazer figa e correr pro abraço!
              </div>
              <div style="padding:16px 24px 16px 24px">
                <table
                  align="center"
                  width="100%"
                  cellpadding="0"
                  border="0"
                  style="table-layout:fixed;border-collapse:collapse"
                >
                  <tbody style="width:100%">
                    <tr style="width:100%">
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:0;padding-right:10.666666666666666px"
                      >
                        <div
                          style="text-align:center;padding:16px 0px 16px 0px"
                        >
                          <a
                            href="https://bolaocopa.omegafox.me/partidas"
                            style="color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#284ea0;border-radius:4px;display:inline-block;padding:8px 12px;text-decoration:none"
                            target="_blank"
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ><span>Apostar</span
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ></a
                          >
                        </div>
                      </td>
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:5.333333333333333px;padding-right:5.333333333333333px"
                      >
                        <div
                          style="text-align:center;padding:16px 0px 16px 0px"
                        >
                          <a
                            href="https://bolaocopa.omegafox.me/extras"
                            style="color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#284ea0;border-radius:4px;display:inline-block;padding:8px 12px;text-decoration:none"
                            target="_blank"
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ><span>Extras</span
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ></a
                          >
                        </div>
                      </td>
                      <td
                        style="box-sizing:content-box;vertical-align:middle;padding-left:10.666666666666666px;padding-right:0"
                      >
                        <div
                          style="text-align:center;padding:16px 0px 16px 0px"
                        >
                          <a
                            href="https://bolaocopa.omegafox.me/regras"
                            style="color:#FFFFFF;font-size:16px;font-weight:bold;background-color:#284ea0;border-radius:4px;display:inline-block;padding:8px 12px;text-decoration:none"
                            target="_blank"
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%;mso-text-raise:18"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ><span>Regras</span
                            ><span
                              ><!--[if mso
                                ]><i
                                  style="letter-spacing: 12px;mso-font-width:-100%"
                                  hidden
                                  >&nbsp;</i
                                ><!
                              [endif]--></span
                            ></a
                          >
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style="padding:0px 0px 0px 0px">
                <a
                  href="https://bolaocopa.omegafox.me/"
                  style="text-decoration:none"
                  target="_blank"
                  ><img
                    alt="Illustration"
                    src="https://assets.omegafox.me/copa/misc/email-footer.png"
                    style="outline:none;border:none;text-decoration:none;vertical-align:middle;display:inline-block;max-width:100%"
                /></a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`;
// JSON TEMPLATE - Built with https://usewaypoint.github.io/email-builder-js/
/*
{
  "root": {
    "type": "EmailLayout",
    "data": {
      "backdropColor": "#D4D4D4",
      "borderRadius": 16,
      "canvasColor": "#FFFFFF",
      "textColor": "#242424",
      "fontFamily": "ROUNDED_SANS",
      "childrenIds": [
        "block-1778749336271",
        "block-1778749600734",
        "block-1778752129131-366",
        "block-1778752479575",
        "block-1778749724759",
        "block-1709571234315",
        "block-1709571247550",
        "block-1778749712842",
        "block-1778749717987",
        "block-1778748982177-841",
        "block-1778754162425-72",
        "block-1778754054230",
        "block-1778754030843",
        "block-1778751981012-600",
        "block-1778751966337",
        "block-1778751981500-188",
        "block-1778754247196-513",
        "block-1778754263819",
        "block-1779055198622-854",
        "block-1779055215033-370",
        "block-1779055226636-546",
        "block-1779055253162-388",
        "block-1779055262801-797",
        "block-1779055278258-560",
        "block-1779055309513-428",
        "block-1778749975246",
        "block-1778750106248",
        "block-1709571302968",
        "block-1778750450515",
        "block-1778750331512",
        "block-1778750376970",
        "block-1778750403549",
        "block-1778750399396",
        "block-1709571282795"
      ]
    }
  },
  "block-1709571234315": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Bem-vindo ao Bolão da Copa 2026! \n\nAqui, você vai poder apostar em todos os jogos (fase de grupos e eliminatórias) para acumular pontos ao longo da competição e, com um pouquinho de sorte, terminar entre os premiados! "
      }
    }
  },
  "block-1709571247550": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Além de apostar nos jogos, também temos apostas extras onde você poderá exercer a futurologia nas seguintes categorias: seleção campeã, seleção com a melhor defesa (fase de grupos), seleção com o melhor ataque (fase de grupos), artilheiro da competição, e melhor jogador da Copa!"
      }
    }
  },
  "block-1709571282795": {
    "type": "Image",
    "data": {
      "style": {
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "url": "https://sports.sbt.com.br/_next/image?url=https%3A%2F%2Fsbt-sports-assets-prod.s3.sa-east-1.amazonaws.com%2FCopa_do_Mundo_2026_comeca_em_junho_com_formato_inedito_e_48_selecoes_4bfcd02ef3.jpg&w=1920&q=90",
        "alt": "Illustration",
        "linkHref": "https://bolaocopa.omegafox.me/",
        "contentAlignment": "middle"
      }
    }
  },
  "block-1709571302968": {
    "type": "Button",
    "data": {
      "style": {
        "fontSize": 14,
        "padding": {
          "top": 16,
          "bottom": 24,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "buttonStyle": "rounded",
        "text": "Regras - Inscrição",
        "url": "https://bolaocopa.omegafox.me/regras?section=inscricoes"
      }
    }
  },
  "block-1778748982177-841": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "markdown": false,
        "text": "Seu cadastro já foi feito mas, para iniciar suas apostas, é necessário efetuar o pagamento da inscrição."
      }
    }
  },
  "block-1778749336271": {
    "type": "ColumnsContainer",
    "data": {
      "style": {
        "backgroundColor": "#19235a",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "fixedWidths": [
          100,
          null,
          null
        ],
        "columnsCount": 2,
        "columnsGap": 0,
        "columns": [
          {
            "childrenIds": [
              "block-1778749339900"
            ]
          },
          {
            "childrenIds": [
              "block-1778749400358"
            ]
          },
          {
            "childrenIds": []
          }
        ]
      }
    }
  },
  "block-1778749339900": {
    "type": "Image",
    "data": {
      "style": {
        "padding": {
          "top": 8,
          "bottom": 8,
          "right": 8,
          "left": 8
        },
        "textAlign": "center"
      },
      "props": {
        "height": 60,
        "url": "https://assets.omegafox.me/copa/misc/taca.png",
        "alt": "Link Bolão da Copa",
        "linkHref": "https://bolaocopa.omegafox.me/",
        "contentAlignment": "middle"
      }
    }
  },
  "block-1778749400358": {
    "type": "Text",
    "data": {
      "style": {
        "color": "#f4b303",
        "fontSize": 24,
        "fontWeight": "bold",
        "textAlign": "left",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "text": "Bolão da Copa 2026"
      }
    }
  },
  "block-1778749600734": {
    "type": "Container",
    "data": {
      "style": {
        "backgroundColor": "#2b5f39",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "childrenIds": [
          "block-1778752465791"
        ]
      }
    }
  },
  "block-1778749712842": {
    "type": "Divider",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "lineColor": "#CCCCCC"
      }
    }
  },
  "block-1778749717987": {
    "type": "Heading",
    "data": {
      "props": {
        "text": "Importante!",
        "level": "h3"
      },
      "style": {
        "color": "#284ea0",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      }
    }
  },
  "block-1778749724759": {
    "type": "Heading",
    "data": {
      "props": {
        "text": "Olá ${user} 👋,",
        "level": "h3"
      },
      "style": {
        "color": "#284ea0",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      }
    }
  },
  "block-1778749975246": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Após pagamento, responda a esse email com o comprovante."
      }
    }
  },
  "block-1778750106248": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Clique no botão abaixo para maiores informações:"
      }
    }
  },
  "block-1778750331512": {
    "type": "Divider",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "lineColor": "#CCCCCC"
      }
    }
  },
  "block-1778750376970": {
    "type": "Heading",
    "data": {
      "props": {
        "text": "Tudo pronto?",
        "level": "h3"
      },
      "style": {
        "color": "#284ea0",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      }
    }
  },
  "block-1778750399396": {
    "type": "ColumnsContainer",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "columnsCount": 3,
        "columnsGap": 16,
        "columns": [
          {
            "childrenIds": [
              "block-1778750521811"
            ]
          },
          {
            "childrenIds": [
              "block-1778750523713"
            ]
          },
          {
            "childrenIds": [
              "block-1778750524886"
            ]
          }
        ]
      }
    }
  },
  "block-1778750403549": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Se sua conta já foi liberada para fazer suas apostas, agora é fazer figa e correr pro abraço!"
      }
    }
  },
  "block-1778750450515": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Se você já efetuou o pagamento, aguarde só mais um pouquinho que um dos administradores vai liberar a sua conta para apostas."
      }
    }
  },
  "block-1778750521811": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Apostar",
        "url": "https://bolaocopa.omegafox.me/partidas"
      }
    }
  },
  "block-1778750523713": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Extras",
        "url": "https://bolaocopa.omegafox.me/extras"
      }
    }
  },
  "block-1778750524886": {
    "type": "Button",
    "data": {
      "style": {
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "buttonBackgroundColor": "#284ea0",
        "size": "small",
        "text": "Regras",
        "url": "https://bolaocopa.omegafox.me/regras"
      }
    }
  },
  "block-1778751966337": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Valor: R$100,00"
      }
    }
  },
  "block-1778751981012-600": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "395.825.028-94"
      }
    }
  },
  "block-1778751981500-188": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Nelson Gimenez da Motta"
      }
    }
  },
  "block-1778752002848": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 24
        }
      },
      "props": {
        "text": "PIX"
      }
    }
  },
  "block-1778752129131-366": {
    "type": "Container",
    "data": {
      "style": {
        "backgroundColor": "#f4b303",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "childrenIds": [
          "block-1778752538308"
        ]
      }
    }
  },
  "block-1778752465791": {
    "type": "Container",
    "data": {
      "style": {
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "childrenIds": [
          "block-1778752471573"
        ]
      }
    }
  },
  "block-1778752471573": {
    "type": "Spacer",
    "data": {}
  },
  "block-1778752479575": {
    "type": "Container",
    "data": {
      "style": {
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "childrenIds": [
          "block-1778752481308"
        ]
      }
    }
  },
  "block-1778752481308": {
    "type": "Spacer",
    "data": {
      "props": {
        "height": 8
      }
    }
  },
  "block-1778752538308": {
    "type": "Spacer",
    "data": {
      "props": {
        "height": 8
      }
    }
  },
  "block-1778752672610": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "<<PIX>>"
      }
    }
  },
  "block-1778752684934-479": {
    "type": "Text",
    "data": {
      "style": {
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 0,
          "left": 24
        }
      },
      "props": {
        "text": "Copia & Cola"
      }
    }
  },
  "block-1778754030843": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "bold",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "🇧🇷 PIX"
      }
    }
  },
  "block-1778754054230": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontSize": 10,
        "fontWeight": "normal",
        "textAlign": "left",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 12,
          "left": 12
        }
      },
      "props": {
        "text": "00020126550014BR.GOV.BCB.PIX0111395825028940218Bolão da Copa 20265204000053039865406100.005802BR5923NELSON GIMENEZ DA MOTTA6009SAO PAULO62170513BolaoCopa20266304F822"
      }
    }
  },
  "block-1778754162425-72": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontWeight": "bold",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "🇧🇷 PIX Copia & Cola"
      }
    }
  },
  "block-1778754247196-513": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontWeight": "bold",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "🇧🇷 PIX QR Code"
      }
    }
  },
  "block-1778754263819": {
    "type": "Image",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        },
        "backgroundColor": "#F5F5F5",
        "textAlign": "center"
      },
      "props": {
        "width": 200,
        "url": "https://assets.omegafox.me/copa/misc/qr-code.png",
        "alt": "PIX QR Code",
        "linkHref": null,
        "contentAlignment": "middle"
      }
    }
  },
  "block-1779055198622-854": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "bold",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "🇵🇹 MB Way"
      }
    }
  },
  "block-1779055215033-370": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "916 166 514"
      }
    }
  },
  "block-1779055226636-546": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Valor: €20.00"
      }
    }
  },
  "block-1779055253162-388": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#E5E5E5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Felipe Zanon do Nascimento"
      }
    }
  },
  "block-1779055262801-797": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontWeight": "bold",
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "🌏 PayPal"
      }
    }
  },
  "block-1779055278258-560": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "felipe@omegafox.me"
      }
    }
  },
  "block-1779055309513-428": {
    "type": "Text",
    "data": {
      "style": {
        "backgroundColor": "#F5F5F5",
        "fontWeight": "normal",
        "padding": {
          "top": 0,
          "bottom": 0,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "text": "Valor: $25.00"
      }
    }
  }
}
*/
