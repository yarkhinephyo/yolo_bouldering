#!/bin/bash

# Author : Yar Khine Phyo

# Usage : sudo serverless-deploy.sh [deploy|remove] [dev|prod] [node|all]
# Ensure S3 bucket is empty before removal

npm ci
rm -f .env
sls() {
  npx serverless "$@"
}

if [[ $1 == "deploy" ]];
then
  (
    cd ./cognito_setup
    sls deploy --stage $2
  )
  (
    cd ./database_setup
    sls deploy --stage $2
  )
  (
    cd ./s3_bucket_setup
    sls deploy --stage $2
  )
  (
    cd ./sns_setup
    sls deploy --stage $2
  )
  (
    cd ./user_microservice
    sls deploy --stage $2
    sls info --verbose | grep ServiceEndpoint | sed s/ServiceEndpoint:\ //g | { read -r var; cd ..; echo "VUE_APP_USER_ENDPOINT_URL=$var" >> .env; }
  )
  (
    cd ./route_microservice
    sls deploy --stage $2
    sls info --verbose | grep ServiceEndpoint | sed s/ServiceEndpoint:\ //g | { read -r var; cd ..; echo "VUE_APP_ROUTE_ENDPOINT_URL=$var" >> .env; }
  )
  if [[ ${3:-node} == "all" ]];
  then
    (
      cd ./predict_microservice
      sls deploy --stage $2
      sls info --verbose | grep ServiceEndpoint | sed s/ServiceEndpoint:\ //g | { read -r var; cd ..; echo "VUE_APP_PREDICT_ENDPOINT_URL=$var" >> .env; }
    )
  fi
elif [[ $1 == "remove" ]];
then
  (
    cd ./route_microservice
    sls remove --stage $2
  )
  (
    cd ./user_microservice
    sls remove --stage $2
  )
  (
    cd ./sns_setup
    sls remove --stage $2
  )
  (
    cd ./s3_bucket_setup
    sls remove --stage $2
  )
  (
    cd ./database_setup
    sls remove --stage $2
  )
  (
    cd ./cognito_setup
    sls remove --stage $2
  )
  if [[ ${3:-node} == "all" ]];
  then
    (
      cd ./predict_microservice
      sls remove --stage $2
    )
  fi
fi
echo "success"
