docker pull itksystem/warehouse-service
docker run -d --name warehouse-service --restart unless-stopped -p 3002:3002 -p 5672:5672 -p 443:443 --env-file .env.prod itksystem/warehouse-service


