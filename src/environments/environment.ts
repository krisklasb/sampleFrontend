
  export const environment = {
    production: false,
    msalConfig: {
        auth: {
            clientId: 'CLIENT_ID',
            authority: 'https://login.microsoftonline.com/TENANT_ID',
        }
    },
    apiConfig: {
        scopes: ['{client_id}/.default'], //api-permission
        uri: 'http://localhost:8080' //backend url
    }
  };
  
