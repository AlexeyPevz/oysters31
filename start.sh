#!/bin/bash
cd /var/www/oysters31.ru
export $(cat .env.production | xargs)
npm run start
