# tenant-tomcat (Helm)

Values:
```
host: "user-abc.<dashed-ip>.sslip.io"
image: tomcat:9.0
containerPort: 8080
servicePort: 80
readiness:
  path: "/"
  initialDelaySeconds: 20
```

Example:
```
helm upgrade --install mytomcat ./helm/tenant-tomcat \
  -n myns --create-namespace \
  --set host=tomcat.<dashed-ip>.sslip.io
```

