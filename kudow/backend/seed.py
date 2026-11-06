import argparse
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, SessionLocal, engine
import models
from security import get_password_hash
from routers.eventos import gerar_chaves

CATEGORIAS_PADRAO = [
    {"descricao": "INFANTIL", "sexo": "MASCULINO", "classificacao": "LIGEIRO", "nome_categoria": "Infantil Masc até 30kg", "idade_minima": 10, "idade_maxima": 12, "peso_minimo": 0, "peso_maximo": 30.0},
    {"descricao": "INFANTIL", "sexo": "MASCULINO", "classificacao": "PESADO", "nome_categoria": "Infantil Masc Acima 30kg", "idade_minima": 10, "idade_maxima": 12, "peso_minimo": 30.1, "peso_maximo": 99.0},
    {"descricao": "JUVENIL", "sexo": "MASCULINO", "classificacao": "LEVE", "nome_categoria": "Juvenil Masc até 60kg", "idade_minima": 13, "idade_maxima": 17, "peso_minimo": 0, "peso_maximo": 60.0},
    {"descricao": "JUVENIL", "sexo": "MASCULINO", "classificacao": "PESADO", "nome_categoria": "Juvenil Masc Acima 60kg", "idade_minima": 13, "idade_maxima": 17, "peso_minimo": 60.1, "peso_maximo": 150.0},
    {"descricao": "ADULTO", "sexo": "MASCULINO", "classificacao": "PENA", "nome_categoria": "Adulto Masc até 70kg", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 0, "peso_maximo": 70.0},
    {"descricao": "ADULTO", "sexo": "MASCULINO", "classificacao": "MEDIO", "nome_categoria": "Adulto Masc até 85kg", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 70.1, "peso_maximo": 85.0},
    {"descricao": "ADULTO", "sexo": "MASCULINO", "classificacao": "PESADO", "nome_categoria": "Adulto Masc Acima 85kg", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 85.1, "peso_maximo": 150.0},
    {"descricao": "ADULTO", "sexo": "MASCULINO", "classificacao": "ABSOLUTO", "nome_categoria": "Adulto Masc Absoluto", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 0, "peso_maximo": 150.0},
    {"descricao": "ADULTO", "sexo": "FEMININO", "classificacao": "LEVE", "nome_categoria": "Adulto Fem até 60kg", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 0, "peso_maximo": 60.0},
    {"descricao": "ADULTO", "sexo": "FEMININO", "classificacao": "PESADO", "nome_categoria": "Adulto Fem Acima 60kg", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 60.1, "peso_maximo": 150.0},
    {"descricao": "ADULTO", "sexo": "FEMININO", "classificacao": "ABSOLUTO", "nome_categoria": "Adulto Fem Absoluto", "idade_minima": 18, "idade_maxima": 35, "peso_minimo": 0, "peso_maximo": 150.0},
    {"descricao": "MASTER", "sexo": "MASCULINO", "classificacao": "ABSOLUTO", "nome_categoria": "Master Masc Misto", "idade_minima": 36, "idade_maxima": 99, "peso_minimo": 0, "peso_maximo": 150.0},
    {"descricao": "MASTER", "sexo": "FEMININO", "classificacao": "ABSOLUTO", "nome_categoria": "Master Fem Misto", "idade_minima": 36, "idade_maxima": 99, "peso_minimo": 0, "peso_maximo": 150.0},
]

def garantir_master_e_categorias(db):
    master = db.query(models.Usuario).filter(models.Usuario.email == "master@kudow.com").first()
    if not master:
        master = models.Usuario(
            email="master@kudow.com",
            nome="Administrador Master",
            hashed_password=get_password_hash("master123"),
            tipo_usuario="MASTER",
            deve_mudar_senha=False,
        )
        db.add(master)
        db.commit()
        db.refresh(master)
        print("-> Usuário MASTER garantido (master@kudow.com / master123)")

    if db.query(models.Categoria).count() == 0:
        for cat_data in CATEGORIAS_PADRAO:
            db.add(models.Categoria(
                descricao=cat_data["descricao"],
                sexo=cat_data["sexo"],
                classificacao=cat_data["classificacao"],
                nome_categoria=cat_data["nome_categoria"],
                idade_minima=cat_data["idade_minima"],
                idade_maxima=cat_data["idade_maxima"],
                peso_minimo=Decimal(str(cat_data["peso_minimo"])),
                peso_maximo=Decimal(str(cat_data["peso_maximo"])),
            ))
        db.commit()
        print(f"-> {len(CATEGORIAS_PADRAO)} categorias padrão cadastradas.")
    return master

def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        garantir_master_e_categorias(db)
        print("-> Banco de dados resetado com sucesso.")
    finally:
        db.close()

def seed_torneio_32_atletas():
    db = SessionLocal()
    try:
        master_user = garantir_master_e_categorias(db)

        entidade = db.query(models.Entidade).filter(models.Entidade.nome == "Federação Paulista de Kudow").first()
        if not entidade:
            entidade = models.Entidade(
                nome="Federação Paulista de Kudow",
                ender="Av. Paulista, 1000 - São Paulo/SP",
                respon="Mestre Carlos Silva",
                telefone="(11) 98765-4321",
                tipo_entidade="ESTADUAL",
                estado="SP",
            )
            db.add(entidade)
            db.commit()
            db.refresh(entidade)

        categoria = db.query(models.Categoria).filter(models.Categoria.descricao == "ADULTO").first()
        hoje = date.today()
        evento = models.Evento(
            evento="Grand Prix Kudow Adulto 2026 - Edição Especial 32 Lutadores",
            data_inicio=hoje,
            data_fim=hoje + timedelta(days=2),
            data_inicio_inscricao=hoje - timedelta(days=10),
            data_fim_inscricao=hoje + timedelta(days=1),
            local="Ginásio do Ibirapuera - São Paulo/SP",
            obs="Torneio Oficial de Categoria Adulto com 32 atletas eliminatórios.",
            entidade_responsavel_id=entidade.codenti,
            premiacao_dinheiro=Decimal("5000.00"),
        )
        db.add(evento)
        db.commit()
        db.refresh(evento)

        nomes_atletas = [
            "Lucas 'O Tanque' Pereira", "Matheus 'Fúria' Costa", "Gabriel 'Imparável' Santos", "Felipe 'Dragão' Oliveira",
            "Bruno 'Navalha' Rodrigues", "Thiago 'Trovão' Almeida", "Rodrigo 'Caçador' Lima", "Rafael 'Espartano' Souza",
            "Diego 'Fênix' Barbosa", "Leonardo 'Tornado' Gomes", "Vitor 'Predador' Martins", "Guilherme 'Gladiador' Araújo",
            "Eduardo 'Gigante' Ribeiro", "André 'Viper' Carvalho", "Daniel 'Monstro' Melo", "Marcelo 'Tigre' Rocha",
            "Caio 'Impacto' Fernandes", "Henrique 'Lobo' Castro", "Renan 'Sombra' Correia", "Igor 'Martelo' Cardoso",
            "Vinicius 'Relâmpago' Teixeira", "Leandro 'Punho de Aço' Cavalcante", "Alexandre 'Viking' Dias", "Gustavo 'Titã' Moura",
            "Samuel 'General' Ramos", "Yuri 'Ninja' Moreira", "Otávio 'Samurai' Farias", "Erick 'Boi' Nogueira",
            "Marcos 'Leão' Duarte", "Hugo 'Gorila' Mendes", "Danilo 'Tubarão' Freitas", "Victor 'Imperador' Nunes",
        ]
        faixas = ["Azul", "Roxa", "Marrom", "Preta"]
        senha_padrao = get_password_hash("123456")

        for i, nome in enumerate(nomes_atletas, start=1):
            cpf = f"{100+i:03d}.{200+i:03d}.{300+i:03d}-{i:02d}"
            email = f"atleta{i}@kudow.com"
            atleta = db.query(models.Atleta).filter(models.Atleta.cpf == cpf).first()
            if not atleta:
                atleta = models.Atleta(
                    nome=nome,
                    entidade_id=entidade.codenti,
                    sexo="MASCULINO",
                    data_nascimento=date(1995, (i % 12) + 1, (i % 28) + 1),
                    altura=Decimal(f"1.{70 + (i % 25)}"),
                    peso=Decimal(f"{70 + (i % 30)}.{i % 9}"),
                    cpf=cpf,
                    faixa=faixas[i % len(faixas)],
                    categoria=categoria.codcat,
                    descricao_cat=categoria.nome_categoria,
                    estado="SP",
                    telefone=f"(11) 91111-{i:04d}",
                )
                db.add(atleta)
                db.flush()

                if not db.query(models.Usuario).filter(models.Usuario.email == email).first():
                    db.add(models.Usuario(
                        email=email,
                        nome=nome,
                        hashed_password=senha_padrao,
                        tipo_usuario="ATLETA",
                        atleta_id=atleta.codatl,
                        deve_mudar_senha=False,
                    ))

            if not db.query(models.Inscricao).filter(
                models.Inscricao.evento_id == evento.codevent,
                models.Inscricao.atleta_id == atleta.codatl,
            ).first():
                db.add(models.Inscricao(
                    evento_id=evento.codevent,
                    atleta_id=atleta.codatl,
                    categoria_id=categoria.codcat,
                    status="CONFIRMADA",
                ))

        db.commit()
        resultado = gerar_chaves(evento_id=evento.codevent, formato="MATA_MATA", db=db, current_user=master_user)
        print(f"-> {resultado['mensagem']}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Utilitário unificado de seed do banco Kudow")
    parser.add_argument("--reset", action="store_true", help="Reseta o banco e recria MASTER + categorias padrão")
    parser.add_argument("--torneio32", action="store_true", help="Popula torneio com 32 atletas e gera chaves")
    args = parser.parse_args()

    if args.reset:
        reset_database()
    if args.torneio32:
        seed_torneio_32_atletas()
    if not args.reset and not args.torneio32:
        parser.print_help()

