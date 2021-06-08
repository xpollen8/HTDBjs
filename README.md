# HTDBjs

A re-write of the HTDB web management system into Javascript.

This is the base HTDBjs class upon which a full-featured project can be built.

If you looking for a starter for running a full HTDB-based website, see the [HTDB-app repository.](https://github.com/xpollen8/HTDB-app)

# Install

```
npm i --save https://github.com/xpollen8/HTDBjs
```

# Example

```
cd example && node index.js
```

# What it is

HTDB is a very old web technology (dating from 1994), and was initially written in C and used as a fast-cgi module for apache web servers.

Its claim to fame is a relatively simple way to manage multiple web pages inside documents containing related "pages", using a text editor.

Those documents would support macro expansions, user-written scripting functions, as well as a suite of DSO library functions to gain access to more sophisticated capabilities: encryption, database, etc

# Why does this exist?

A few people have put significan work into developing HTDB-based websites. As times change, the way the world delivers websites is less via apache and more via serverless methods.

HTDBjs attempts to bridge these worlds, by allowing a modern nextjs/React application to be able to parse and deliver the older HTDB documents without much fuss.
