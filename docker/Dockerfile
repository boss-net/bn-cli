FROM denoland/deno:1.27.2
COPY bn.bundle.js /
RUN chmod +x /bn.bundle.js
ENTRYPOINT ["/bn.bundle.js"]
CMD [ "--help" ]