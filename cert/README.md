本地运行https:

1. 创建cert

   ```bash
   mkdir cert
   openssl req -x509 -newkey rsa:2048 -nodes \
     -keyout cert/key.pem \
     -out cert/cert.pem \
     -days 365
   ```


   



