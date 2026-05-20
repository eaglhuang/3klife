import argparse
from app.service import run_job
from app.api import create_app


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    run_job(args.input)
    create_app()
    with open("artifacts/output.txt", "w") as fp:
        fp.write(args.input)


if __name__ == "__main__":
    main()

