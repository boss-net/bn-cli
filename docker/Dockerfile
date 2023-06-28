FROM denoland/deno
COPY bn.bundle.js /
RUN chmod +x /bn.bundle.js
ENTRYPOINT ["/bn.bundle.js"]
CMD [ "--help" ]
